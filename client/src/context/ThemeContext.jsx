import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';

// Paletas disponibles. Los colores reales viven en src/index.css; `swatch` solo
// se usa para la vista previa en Configuración.
export const THEMES = [
  { id: 'cyan', label: 'Cyan', description: 'Cloud Console', swatch: { dark: ['#0f1117', '#1a1d27', '#06b6d4'], light: ['#f4f6f9', '#ffffff', '#0891b2'] } },
  { id: 'indigo', label: 'Índigo', description: 'Violeta profundo', swatch: { dark: ['#0e0e18', '#181828', '#818cf8'], light: ['#f5f5fc', '#ffffff', '#4f46e5'] } },
  { id: 'emerald', label: 'Esmeralda', description: 'Verde sobrio', swatch: { dark: ['#0c1210', '#151e1b', '#34d399'], light: ['#f3f7f5', '#ffffff', '#059669'] } },
];

export const MODES = ['dark', 'light', 'system'];

const DEFAULT_PREF = { theme: 'cyan', mode: 'dark' };
// Último tema aplicado en este navegador: lo lee public/theme-init.js antes del
// primer pintado (también en el login, cuando aún no hay usuario).
const LAST_KEY = 'csqlim:appearance';
const userKey = (user) => `${LAST_KEY}:${user.id}`;

function readPref(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved && THEMES.some((t) => t.id === saved.theme) && MODES.includes(saved.mode)) return saved;
  } catch {
    // storage no disponible o valor corrupto
  }
  return null;
}

function writePref(keys, pref) {
  try {
    for (const k of keys) localStorage.setItem(k, JSON.stringify(pref));
  } catch {
    // sin storage: la preferencia dura solo esta sesión
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [pref, setPref] = useState(() => readPref(LAST_KEY) ?? DEFAULT_PREF);
  const [osDark, setOsDark] = useState(systemDark);

  // Al iniciar sesión, carga la preferencia de ese usuario (si tiene una).
  useEffect(() => {
    if (!user) return;
    const saved = readPref(userKey(user));
    if (saved) {
      setPref(saved);
      writePref([LAST_KEY], saved);
    }
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

  const update = useCallback((patch) => {
    setPref((prev) => {
      const next = { ...prev, ...patch };
      writePref(user ? [LAST_KEY, userKey(user)] : [LAST_KEY], next);
      return next;
    });
  }, [user]);

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
