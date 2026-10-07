import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api } from '../api/client.js';

// Paletas disponibles. Los colores reales viven en src/index.css; `swatch` solo
// se usa para la vista previa en Configuración.
export const THEMES = [
  { id: 'cyan', label: 'Cyan', description: 'Cloud Console', swatch: { dark: ['#0f1117', '#1a1d27', '#06b6d4'], light: ['#f4f6f9', '#ffffff', '#0891b2'] } },
  { id: 'indigo', label: 'Índigo', description: 'Violeta profundo', swatch: { dark: ['#0e0e18', '#181828', '#818cf8'], light: ['#f5f5fc', '#ffffff', '#4f46e5'] } },
  { id: 'emerald', label: 'Esmeralda', description: 'Verde sobrio', swatch: { dark: ['#0c1210', '#151e1b', '#34d399'], light: ['#f3f7f5', '#ffffff', '#059669'] } },
];

export const MODES = ['dark', 'light', 'system'];

const DEFAULT_PREF = { theme: 'cyan', mode: 'dark' };
// La preferencia de cada usuario se guarda en la BD (users.ui_theme/ui_mode).
// LAST_KEY es solo una copia local del último tema aplicado, para que
// public/theme-init.js lo pinte antes de cargar la app (también en el login).
const LAST_KEY = 'csqlim:appearance';
// Clave por usuario de la versión anterior (solo localStorage); se migra a la BD.
const legacyUserKey = (user) => `${LAST_KEY}:${user.id}`;

function readPref(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved && THEMES.some((t) => t.id === saved.theme) && MODES.includes(saved.mode)) return saved;
  } catch {
    // storage no disponible o valor corrupto
  }
  return null;
}

function writeLastPref(pref) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(pref));
  } catch {
    // sin storage: solo se pierde el pintado previo a cargar la app
  }
}

function prefFromUser(user) {
  if (!user.ui_theme && !user.ui_mode) return null;
  return { theme: user.ui_theme ?? DEFAULT_PREF.theme, mode: user.ui_mode ?? DEFAULT_PREF.mode };
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [pref, setPref] = useState(() => readPref(LAST_KEY) ?? DEFAULT_PREF);
  const [osDark, setOsDark] = useState(systemDark);

  // Al iniciar sesión, aplica la preferencia guardada del usuario. Si aún no
  // tiene, migra la que guardaba la versión anterior en este navegador o, si
  // tampoco hay, usa la predeterminada (no hereda la del último usuario).
  useEffect(() => {
    if (!user) return;
    let next = prefFromUser(user);
    if (!next) {
      const legacy = readPref(legacyUserKey(user));
      if (legacy) api.updateAppearance(legacy).catch(() => {});
      next = legacy ?? DEFAULT_PREF;
    }
    try { localStorage.removeItem(legacyUserKey(user)); } catch { /* sin storage */ }
    setPref(next);
    writeLastPref(next);
  }, [user]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = pref.mode === 'system' ? osDark : pref.mode === 'dark';

  // Se aplica en <html> y luego se leen los colores para los gráficos (tienen
  // que leerse después de aplicar la clase, por eso no se calculan en render).
  const [chartColors, setChartColors] = useState(readChartColors);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', pref.theme);
    root.classList.toggle('dark', isDark);
    setChartColors(readChartColors());
  }, [pref.theme, isDark]);

  // Se aplica al instante; si falla el guardado en la BD solo se pierde para
  // la próxima sesión, así que no se revierte.
  const update = useCallback((patch) => {
    const next = { ...pref, ...patch };
    setPref(next);
    writeLastPref(next);
    if (user) {
      api.updateAppearance(patch).catch((err) => console.warn('[theme] No se pudo guardar la apariencia:', err.message));
    }
  }, [pref, user]);

  const value = useMemo(() => ({
    theme: pref.theme,
    mode: pref.mode,
    isDark,
    setTheme: (theme) => update({ theme }),
    setMode: (mode) => update({ mode }),
    chartColors,
  }), [pref, isDark, update, chartColors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}

// Recharts pinta SVG con atributos, que no resuelven var(); se usan los valores
// computados de las variables CSS del tema activo.
export function useChartColors() {
  return useTheme().chartColors;
}

function readChartColors() {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const rgb = (name) => css.getPropertyValue(name).trim().split(/\s+/).join(',');
  const accent = rgb('--accent');
  const fg = rgb('--fg');
  const dark = root.classList.contains('dark');
  return {
    accent: `rgb(${accent})`,
    accentAlpha: (a) => `rgba(${accent},${a})`,
    tick: `rgba(${fg},${dark ? 0.4 : 0.55})`,
    cursor: `rgba(${fg},0.04)`,
    sliceStroke: `rgb(${rgb('--surface-card')})`,
  };
}
