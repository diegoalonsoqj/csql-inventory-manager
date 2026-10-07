import { useState, useEffect, useRef } from 'react';
import { Loader2, Clock, KeyRound, Upload, CheckCircle2, XCircle, Trash2, ShieldCheck, Network, AlertTriangle, CalendarClock, Plus, X, Palette, Moon, Sun, Monitor, Check } from 'lucide-react';
import { Header } from '../components/layout/Header.jsx';
import { api } from '../api/client.js';
import { setAppTimezone, formatDate, cn } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme, THEMES } from '../context/ThemeContext.jsx';

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
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-xs text-fg/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const EMPTY_AD = { enabled: false, url: '', domain: '', tlsVerify: true };

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-accent' : 'bg-fg/15'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

function ResultBox({ result }) {
  if (!result) return null;
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${result.ok ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'}`}>
      {result.ok
        ? <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
        : <XCircle size={15} className="text-danger mt-0.5 shrink-0" />}
      <p className={`text-xs break-words min-w-0 ${result.ok ? 'text-success' : 'text-danger'}`}>{result.message}</p>
    </div>
  );
}

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const DEFAULT_SYNC = { enabled: false, mode: 'interval', intervalHours: 6, times: ['08:00', '14:00'] };
const MAX_TIMES = 12;

function SyncScheduleCard({ initial, onSaved }) {
  const pick = (s) => ({ enabled: s.enabled, mode: s.mode, intervalHours: s.intervalHours, times: s.times });
  const [form, setForm] = useState(() => pick(initial ?? DEFAULT_SYNC));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dirty = JSON.stringify(form) !== JSON.stringify(pick(initial ?? DEFAULT_SYNC));
  const update = (field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setError(''); };
  const setTime = (i, value) => update('times', form.times.map((t, j) => (j === i ? value : t)));
  const addTime = () => update('times', [...form.times, '12:00']);
  const removeTime = (i) => update('times', form.times.filter((_, j) => j !== i));

  const handleSave = async () => {
    const times = form.times.filter(Boolean);
    if (form.mode === 'schedule' && times.length === 0) { setError('Agrega al menos un horario'); return; }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const s = await api.updateSettings({ syncSchedule: { ...form, times } });
      setForm(pick(s.syncSchedule));
      onSaved(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (value, label) => (
    <button
      type="button"
      onClick={() => update('mode', value)}
      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
        form.mode === value
          ? 'border-accent/40 bg-accent-muted text-accent'
          : 'border-surface-border text-fg/50 hover:text-fg hover:bg-surface-hover'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card
      icon={CalendarClock}
      title="Sincronización automática"
      subtitle="Sincroniza con GCP sin tener que pulsar el botón. El botón Sync GCP sigue funcionando."
    >
      <div className="flex items-center justify-between gap-4 mb-4 p-3 rounded-lg bg-surface border border-surface-border">
        <div className="min-w-0">
          <p className="text-sm text-fg/80">Habilitar sincronización automática</p>
          <p className="text-xs text-fg/40 mt-0.5">
            {initial?.enabled && initial?.nextRunAt
              ? `Próxima: ${formatDate(initial.nextRunAt)}`
              : 'Deshabilitada, solo se sincroniza con el botón.'}
          </p>
        </div>
        <Toggle checked={form.enabled} onChange={(v) => update('enabled', v)} label="Habilitar sincronización automática" />
      </div>

      <div className={form.enabled ? '' : 'opacity-50'}>
        <label className="block text-xs font-medium text-fg/60 mb-1.5">Frecuencia</label>
        <div className="flex gap-2 mb-4">
          {modeBtn('interval', 'Cada X horas')}
          {modeBtn('schedule', 'A horas fijas')}
        </div>

        {form.mode === 'interval' ? (
          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">Intervalo</label>
            <select
              value={form.intervalHours}
              onChange={(e) => update('intervalHours', Number(e.target.value))}
              className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
            >
              {INTERVAL_OPTIONS.map((h) => (
                <option key={h} value={h}>Cada {h} {h === 1 ? 'hora' : 'horas'}</option>
              ))}
            </select>
            <p className="text-xs text-fg/30 mt-2">
              Recomendado. Cuenta desde el último sync, manual o automático: si alguien sincronizó hace poco,
              el automático espera y no repite el trabajo.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-fg/60 mb-1.5">Horarios</label>
            <div className="flex flex-wrap gap-2">
              {form.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg pl-2 pr-1 py-1">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => setTime(i, e.target.value)}
                    className="bg-transparent text-sm font-mono text-fg/80 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeTime(i)}
                    title="Quitar horario"
                    className="p-1 rounded text-fg/30 hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {form.times.length < MAX_TIMES && (
                <button
                  type="button"
                  onClick={addTime}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-surface-border text-xs text-fg/50 hover:text-accent hover:border-accent/40 transition-colors"
                >
                  <Plus size={13} />
                  Agregar
                </button>
              )}
            </div>
            <p className="text-xs text-fg/30 mt-2">
              En la zona horaria configurada arriba. Útil si quieres el inventario al día a una hora concreta,
              por ejemplo antes de empezar la jornada.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger mt-3">{error}</p>}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>
    </Card>
  );
}

function AdminSettings() {
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

  // Active Directory
  const [ad, setAd] = useState(EMPTY_AD);
  const [savingAd, setSavingAd] = useState(false);
  const [adSaved, setAdSaved] = useState(false);
  const [adError, setAdError] = useState('');
  const [adTest, setAdTest] = useState({ username: '', password: '' });
  const [testingAd, setTestingAd] = useState(false);
  const [adTestResult, setAdTestResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await api.getSettings();
      setSettings(s);
      setTz(s.timezone);
      setAd(s.ad ?? EMPTY_AD);
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

  const updateAd = (field, value) => {
    setAd((prev) => ({ ...prev, [field]: value }));
    setAdError('');
    setAdTestResult(null);
  };

  const adDirty = JSON.stringify(ad) !== JSON.stringify(settings?.ad ?? EMPTY_AD);

  const handleSaveAd = async () => {
    setSavingAd(true);
    setAdError('');
    setAdSaved(false);
    try {
      const s = await api.updateSettings({ ad });
      setSettings(s);
      setAd(s.ad);
      setAdSaved(true);
      setTimeout(() => setAdSaved(false), 2500);
    } catch (err) {
      setAdError(err.message);
    } finally {
      setSavingAd(false);
    }
  };

  // Prueba con lo que hay en el formulario (aunque no esté guardado).
  const handleTestAd = async (e) => {
    e.preventDefault();
    setTestingAd(true);
    setAdTestResult(null);
    try {
      const result = await api.testAdConnection({
        url: ad.url.trim(),
        domain: ad.domain.trim(),
        tlsVerify: ad.tlsVerify,
        username: adTest.username.trim(),
        password: adTest.password,
      });
      setAdTestResult({ ok: true, message: result.message });
    } catch (err) {
      setAdTestResult({ ok: false, message: err.message });
    } finally {
      setTestingAd(false);
      setAdTest((prev) => ({ ...prev, password: '' }));
    }
  };

  const adInsecure = /^ldap:\/\//i.test(ad.url.trim());
  const adIsLdaps = /^ldaps:\/\//i.test(ad.url.trim());
  const inputCls = 'w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20';

  const sa = settings?.gcpServiceAccount;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="text-accent animate-spin" /></div>;
  if (error) return <div className="text-center py-16 text-danger text-sm">{error}</div>;

  return (
          <>
            {/* Zona horaria */}
            <Card icon={Clock} title="Zona horaria" subtitle="Se usa para mostrar todas las fechas de la aplicación">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-fg/60 mb-1.5">Zona horaria (IANA)</label>
                  <select
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="w-full bg-surface border border-surface-border text-sm text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
                  >
                    {TIMEZONES.includes(tz) ? null : <option value={tz}>{tz}</option>}
                    {TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleSaveTz}
                  disabled={savingTz || tz === settings?.timezone}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingTz && <Loader2 size={14} className="animate-spin" />}
                  {tzSaved ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-fg/30 mt-2">Ejemplo de fecha: {formatDate(new Date().toISOString())}</p>
            </Card>

            {/* Sincronización automática. key: se remonta con los valores guardados. */}
            <SyncScheduleCard
              key={JSON.stringify(settings?.syncSchedule)}
              initial={settings?.syncSchedule}
              onSaved={setSettings}
            />

            {/* Active Directory */}
            <Card
              icon={Network}
              title="Active Directory"
              subtitle="Login de usuarios de tipo AD con su usuario y contraseña de red (DOMINIO\usuario)."
            >
              <div className="flex items-center justify-between gap-4 mb-4 p-3 rounded-lg bg-surface border border-surface-border">
                <div className="min-w-0">
                  <p className="text-sm text-fg/80">Habilitar login con AD</p>
                  <p className="text-xs text-fg/40 mt-0.5">
                    Deshabilitado, los usuarios AD no pueden entrar; los locales no se ven afectados.
                  </p>
                </div>
                <Toggle checked={ad.enabled} onChange={(v) => updateAd('enabled', v)} label="Habilitar login con AD" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-fg/60 mb-1.5">Servidor (URL)</label>
                  <input
                    type="text"
                    value={ad.url}
                    onChange={(e) => updateAd('url', e.target.value)}
                    placeholder="ldap://126.26.3.151"
                    spellCheck={false}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg/60 mb-1.5">Dominio</label>
                  <input
                    type="text"
                    value={ad.domain}
                    onChange={(e) => updateAd('domain', e.target.value.toUpperCase())}
                    placeholder="INTERSEGURO"
                    spellCheck={false}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              {adIsLdaps && (
                <label className="flex items-center gap-2 mt-3 text-xs text-fg/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ad.tlsVerify}
                    onChange={(e) => updateAd('tlsVerify', e.target.checked)}
                    className="accent-accent"
                  />
                  Verificar el certificado del servidor (desmárcalo solo si el DC usa un certificado de una CA interna no confiable)
                </label>
              )}

              {adInsecure && (
                <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 bg-warning/10 border border-warning/20">
                  <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning/90">
                    Con ldap:// la contraseña de red viaja sin cifrar entre este servidor y el DC.
                    Si el controlador de dominio tiene certificado, usa ldaps://…:636.
                  </p>
                </div>
              )}

              {adError && (
                <div className="mt-3 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-danger">{adError}</p>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSaveAd}
                  disabled={savingAd || !adDirty}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingAd && <Loader2 size={14} className="animate-spin" />}
                  {adSaved ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>

              {/* Prueba con una cuenta real */}
              <form onSubmit={handleTestAd} className="mt-5 pt-5 border-t border-surface-border">
                <p className="text-xs font-medium text-fg/60 mb-1">Probar conexión</p>
                <p className="text-xs text-fg/30 mb-3">
                  Hace un login real con los datos del formulario (aunque no estén guardados). La contraseña no se guarda.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={adTest.username}
                    onChange={(e) => setAdTest((p) => ({ ...p, username: e.target.value }))}
                    placeholder="usuario de red"
                    autoComplete="off"
                    spellCheck={false}
                    className={`${inputCls} font-mono`}
                  />
                  <input
                    type="password"
                    value={adTest.password}
                    onChange={(e) => setAdTest((p) => ({ ...p, password: e.target.value }))}
                    placeholder="contraseña"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                  <button
                    type="submit"
                    disabled={testingAd || !adTest.username.trim() || !adTest.password || !ad.url.trim() || !ad.domain.trim()}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 text-sm text-accent border border-accent/30 bg-accent-muted rounded-lg hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingAd ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Probar
                  </button>
                </div>
                <ResultBox result={adTestResult} />
              </form>
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
                    <ShieldCheck size={16} className="text-success mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-success">Credencial configurada</p>
                      <p className="text-xs text-fg/50 font-mono truncate mt-0.5">{sa.client_email}</p>
                      <p className="text-xs text-fg/30 mt-0.5">
                        Proyecto: {sa.project_id} · Actualizada: {formatDate(sa.updated_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <XCircle size={16} className="text-fg/30 shrink-0" />
                    <p className="text-xs text-fg/50">
                      Sin credencial configurada. Se usarán las Application Default Credentials del entorno, si existen.
                    </p>
                  </div>
                )}
              </div>

              <label className="block text-xs font-medium text-fg/60 mb-1.5">
                {sa?.configured ? 'Reemplazar credencial' : 'Agregar credencial'} — pega el JSON o sube el archivo
              </label>
              <textarea
                value={saJson}
                onChange={(e) => { setSaJson(e.target.value); setTestResult(null); setSaError(''); }}
                rows={7}
                placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..." }'
                spellCheck={false}
                className="w-full bg-surface border border-surface-border text-xs font-mono text-fg/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-fg/20 resize-y"
              />

              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />

              <ResultBox result={testResult} />

              {saError && (
                <div className="mt-3 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-danger">{saError}</p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm text-fg/60 border border-surface-border rounded-lg hover:text-fg hover:bg-surface-hover transition-colors"
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
                    className="flex items-center gap-2 px-3.5 py-2 text-sm text-fg/50 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
                <button
                  onClick={handleSaveSa}
                  disabled={savingSa || !saJson.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSa && <Loader2 size={14} className="animate-spin" />}
                  {saSaved ? 'Guardado ✓' : 'Guardar credencial'}
                </button>
              </div>
            </Card>
          </>
  );
}

const MODE_OPTIONS = [
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

function AppearanceCard() {
  const { theme, mode, isDark, setTheme, setMode } = useTheme();

  return (
    <Card icon={Palette} title="Apariencia" subtitle="Paleta de colores y modo. Se guarda en tu usuario y te sigue en cualquier equipo.">
      <label className="block text-xs font-medium text-fg/60 mb-1.5">Paleta</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {THEMES.map((t) => {
          const [bg, card, accent] = t.swatch[isDark ? 'dark' : 'light'];
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={active}
              className={cn(
                'text-left rounded-lg border p-2.5 transition-colors',
                active ? 'border-accent/60 bg-accent-muted' : 'border-surface-border hover:bg-surface-hover'
              )}
            >
              {/* Mini vista previa: fondo, tarjeta y acento del tema en el modo actual */}
              <div className="h-14 rounded-md p-1.5 flex gap-1.5 border border-surface-border" style={{ background: bg }}>
                <div className="w-3 rounded-sm" style={{ background: card }} />
                <div className="flex-1 rounded-sm p-1.5 flex flex-col justify-between" style={{ background: card }}>
                  <div className="h-1.5 w-2/3 rounded-full" style={{ background: accent }} />
                  <div className="h-1.5 w-1/3 rounded-full opacity-40" style={{ background: accent }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm font-medium text-fg">{t.label}</p>
                  <p className="text-xs text-fg/40">{t.description}</p>
                </div>
                {active && <Check size={15} className="text-accent shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      <label className="block text-xs font-medium text-fg/60 mb-1.5">Modo</label>
      <div className="flex gap-2">
        {MODE_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              mode === id
                ? 'border-accent/40 bg-accent-muted text-accent'
                : 'border-surface-border text-fg/50 hover:text-fg hover:bg-surface-hover'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="pt-7 pb-4 shrink-0">
        <Header
          title="Configuración"
          subtitle={isAdmin ? 'Apariencia, ajustes generales y credenciales de la plataforma' : 'Preferencias de apariencia'}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto pb-7">
        <div className="max-w-2xl space-y-6">
          <AppearanceCard />
          {isAdmin && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}
