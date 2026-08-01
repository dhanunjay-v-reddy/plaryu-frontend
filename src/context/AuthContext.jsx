import { createContext, useContext, useState } from 'react';
import { login as loginService, register as registerService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('plaryu_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function persistSession(data) {
    // data: { token, userId, name, email, role }
    localStorage.setItem('plaryu_token', data.token);
    const sessionUser = {
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      verified: data.verified,
    };
    localStorage.setItem('plaryu_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
  }

  async function login(credentials) {
    setLoading(true);
    setError(null);
    try {
      const data = await loginService(credentials);
      persistSession(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await registerService(payload);
      persistSession(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('plaryu_token');
    localStorage.removeItem('plaryu_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
