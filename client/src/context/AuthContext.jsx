import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { setAppTimezone } from '../lib/utils.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.logout(); // limpia las cookies en el servidor
    } catch {
      // Aunque falle la llamada, cerramos sesión localmente.
    }
    setUser(null);
  }, []);

  // Al arrancar, valida la sesión contra /me (la cookie httpOnly viaja sola).
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const { user } = await api.getMe();
        if (!cancelled) setUser(user);
      } catch {
        // Sin sesión válida: se queda en la pantalla de login.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Al autenticarse, carga la zona horaria configurada para el formateo de fechas.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getPublicSettings()
      .then((s) => { if (!cancelled) setAppTimezone(s.timezone); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // Cualquier 401 desde el cliente API fuerza logout global.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  // username: correo (usuarios locales) o usuario de red (AD).
  const login = useCallback(async (username, password) => {
    const { user } = await api.login({ username, password });
    setUser(user);
    return user;
  }, []);

  const role = user?.role;
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    // Puede gestionar proyectos y ejecutar sync: admin u operator.
    canManageProjects: role === 'admin' || role === 'operator',
    canSync: role === 'admin' || role === 'operator',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
