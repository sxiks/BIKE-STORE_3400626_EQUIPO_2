import { createContext, useMemo, useState } from 'react';
import { login as loginService } from '../services/auth.service';
import { clearSession, getToken, getUser, saveSession } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getUser());

  async function login(credentials) {
    // La API responde { ok: true, data: { user, token } }
    const { data } = await loginService(credentials);
    saveSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    clearSession();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    ()=>({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
