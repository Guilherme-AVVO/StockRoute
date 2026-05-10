import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginService, logout as logoutService, getMe, getSavedToken } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true enquanto valida sessão inicial

  // Ao montar, valida o token salvo no sessionStorage antes de liberar a tela.
  // Se o backend rejeitar o token, a sessão local é limpa sem expor o token.
  useEffect(() => {
    async function checkSession() {
      const token = getSavedToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getMe();
        setUser(data.user);
      } catch {
        // Token inválido ou expirado — limpa sessão silenciosamente
        logoutService();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  // Faz login no backend e mantém no contexto apenas os dados públicos do usuário.
  async function login(email, password) {
    const data = await loginService(email, password);
    setUser(data.user);
    return data;
  }

  // Logout local: remove token/usuário do sessionStorage e volta para a tela de login.
  function logout() {
    logoutService();
    setUser(null);
  }

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
