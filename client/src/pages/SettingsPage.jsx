import { useState, useEffect, useRef } from 'react';
import { Loader2, Clock, KeyRound, Upload, CheckCircle2, XCircle, Trash2, ShieldCheck } from 'lucide-react';
import { Header } from '../components/layout/Header.jsx';
import { api } from '../api/client.js';
import { setAppTimezone, formatDate } from '../lib/utils.js';

const TIMEZONES = [
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'UTC',
];

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
          <Icon size={17} className="text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Zona horaria
  const [tz, setTz] = useState('America/Lima');
  const [savingTz, setSavingTz] = useState(false);
  const [tzSaved, setTzSaved] = useState(false);

  // Cuenta de servicio
  const [saJson, setSaJson] = useState('');
  const [savingSa, setSavingSa] = useState(false);
  const [saError, setSaError] = useState('');
  const [saSaved, setSaSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // {ok, message}
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await api.getSettings();
      setSettings(s);
      setTz(s.timezone);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveTz = async () => {
    setSavingTz(true);
    setTzSaved(false);
    try {
      const s = await api.updateSettings({ timezone: tz });
      setSettings(s);
      setAppTimezone(s.timezone);
      setTzSaved(true);
      setTimeout(() => setTzSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTz(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSaJson(text);
    setTestResult(null);
    setSaError('');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setSaError('');
    try {
      // Si el textarea tiene contenido, prueba esa credencial sin guardar;
      // si está vacío, prueba la ya guardada.
      const result = await api.testGcpCredential(saJson.trim() || undefined);
      setTestResult({ ok: true, message: result.message });
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSa = async () => {
    if (!saJson.trim()) return;
    setSavingSa(true);
    setSaError('');
    setSaSaved(false);
    try {
      const s = await api.updateSettings({ service_account_json: saJson });
      setSettings(s);
      setSaJson('');
      setTestResult(null);
      setSaSaved(true);
      setTimeout(() => setSaSaved(false), 2500);
    } catch (err) {
      setSaError(err.message);
    } finally {
      setSavingSa(false);
    }
  };

  const handleClearSa = async () => {
    setSavingSa(true);
    setSaError('');
    try {
      const s = await api.updateSettings({ service_account_json: null });
      setSettings(s);
      setSaJson('');
      setTestResult(null);
    } catch (err) {
      setSaError(err.message);
    } finally {
      setSavingSa(false);
    }
  };

  const sa = settings?.gcpServiceAccount;

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 pb-4 shrink-0">
        <Header title="Configuración" subtitle="Ajustes generales y credenciales de la plataforma" />
      </div>

      <div className="flex-1 min-h-0 overflow-auto pb-7">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="text-accent animate-spin" /></div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Zona horaria */}
            <Card icon={Clock} title="Zona horaria" subtitle="Se usa para mostrar todas las fechas de la aplicación">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Zona horaria (IANA)</label>
                  <select
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="w-full bg-surface border border-surface-border text-sm text-white/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
                  >
                    {TIMEZONES.includes(tz) ? null : <option value={tz}>{tz}</option>}
                    {TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleSaveTz}
                  disabled={savingTz || tz === settings?.timezone}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-surface text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingTz && <Loader2 size={14} className="animate-spin" />}
                  {tzSaved ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-white/30 mt-2">Ejemplo de fecha: {formatDate(new Date().toISOString())}</p>
            </Card>

            {/* Cuenta de servicio GCP */}
            <Card
              icon={KeyRound}
              title="Cuenta de servicio de GCP"
              subtitle="Credencial usada para consultar la API de Cloud SQL. Se guarda cifrada en la base de datos."
            >
              {/* Estado actual */}
              <div className="mb-4 p-3 rounded-lg bg-surface border border-surface-border">
                {sa?.configured ? (
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-green-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-green-400">Credencial configurada</p>
                      <p className="text-xs text-white/50 font-mono truncate mt-0.5">{sa.client_email}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        Proyecto: {sa.project_id} · Actualizada: {formatDate(sa.updated_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <XCircle size={16} className="text-white/30 shrink-0" />
                    <p className="text-xs text-white/50">
                      Sin credencial configurada. Se usarán las Application Default Credentials del entorno, si existen.
                    </p>
                  </div>
                )}
              </div>

              <label className="block text-xs font-medium text-white/60 mb-1.5">
                {sa?.configured ? 'Reemplazar credencial' : 'Agregar credencial'} — pega el JSON o sube el archivo
              </label>
              <textarea
                value={saJson}
                onChange={(e) => { setSaJson(e.target.value); setTestResult(null); setSaError(''); }}
                rows={7}
                placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..." }'
                spellCheck={false}
                className="w-full bg-surface border border-surface-border text-xs font-mono text-white/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-white/20 resize-y"
              />

              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />

              {testResult && (
                <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${testResult.ok ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {testResult.ok
                    ? <CheckCircle2 size={15} className="text-green-400 mt-0.5 shrink-0" />
                    : <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />}
                  <p className={`text-xs ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</p>
                </div>
              )}

              {saError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-red-400">{saError}</p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm text-white/60 border border-surface-border rounded-lg hover:text-white hover:bg-surface-hover transition-colors"
                >
                  <Upload size={14} /> Subir .json
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing || (!saJson.trim() && !sa?.configured)}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm text-accent border border-accent/30 bg-accent-muted rounded-lg hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Probar credencial
                </button>

                <div className="flex-1" />

                {sa?.configured && (
                  <button
                    onClick={handleClearSa}
                    disabled={savingSa}
                    title="Eliminar credencial guardada"
                    className="flex items-center gap-2 px-3.5 py-2 text-sm text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
                <button
                  onClick={handleSaveSa}
                  disabled={savingSa || !saJson.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-surface text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSa && <Loader2 size={14} className="animate-spin" />}
                  {saSaved ? 'Guardado ✓' : 'Guardar credencial'}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
