import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService, me as meService } from '../services/auth.service';
import { registrarManejadorSesionInvalida } from '../services/api';
import { useToast } from './ToastContext';
import {
  clearSession,
  getToken,
  getUser,
  limpiarClavesAntiguas,
  saveSession,
  saveUser
} from '../utils/storage';

export const AuthContext = createContext(null);

const MSG_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión de nuevo.';
// Rechazos con un mensaje propio de la API que vale la pena mostrar tal cual al abrir la app.
// SESION_REVOCADA: la contraseña se restableció en otro lugar (auditoría H-04, backend B4).
const CODIGOS_CON_MENSAJE = ['CUENTA_DESACTIVADA', 'SESION_REVOCADA'];

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();

  const [token, setToken] = useState(() => {
    limpiarClavesAntiguas();
    return getToken();
  });
  const [user, setUser] = useState(() => (getToken() ? getUser() : null));
  // true mientras se valida con la API un token guardado (F1.2 lo usa para no redirigir antes de tiempo).
  const [verificando, setVerificando] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    // La API responde { ok: true, data: { user, token } }
    const { data } = await loginService(credentials);
    saveSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Cualquier petición con token que la API rechace (401, o 403 CUENTA_DESACTIVADA) cierra la sesión.
  useEffect(
    () =>
      registrarManejadorSesionInvalida((error) => {
        logout();
        mostrar(error.message);
        navigate('/login', { replace: true });
      }),
    [logout, mostrar, navigate]
  );

  // Al abrir la app con un token guardado, se valida y se refrescan nombre y rol desde la base.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelado = false;

    meService()
      .then(({ data }) => {
        if (cancelado) return;
        saveUser(data);
        setUser(data);
      })
      .catch((error) => {
        if (cancelado) return;
        // Sin conexión (status 0) no se puede saber si el token es válido: se conserva la sesión.
        if (error.status === 401 || error.status === 403) {
          logout();
          mostrar(CODIGOS_CON_MENSAJE.includes(error.code) ? error.message : MSG_SESION_VENCIDA);
        }
      })
      .finally(() => {
        if (!cancelado) setVerificando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [logout, mostrar]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: user?.rol === 'admin',
      verificando,
      login,
      logout
    }),
    [token, user, verificando, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
