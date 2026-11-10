import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";
import { TOKEN_KEY } from "../config";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  // Restore the session on page refresh
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const { data } = await api.post("/auth/login", { identifier, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "chairperson" }}>
      {children}
    </AuthContext.Provider>
  );
}