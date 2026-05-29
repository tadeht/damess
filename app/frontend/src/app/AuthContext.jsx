import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me")
      .then((response) => setUser(response.data.data))
      .catch(() => {
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("accessToken");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Heartbeat ngầm mỗi 30 giây để duy trì trạng thái Online (Redis Bitmap)
  useEffect(() => {
    if (!user) return;
    
    // Bắn nhịp tim ngay lần đầu
    api.post("/users/heartbeat").catch(() => {});
    
    const interval = setInterval(() => {
      api.post("/users/heartbeat").catch(() => {});
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  async function login(identifier, password, remember = false) {
    const response = await api.post("/auth/login", { identifier, password });
    const { token, user: currentUser } = response.data.data;

    if (remember) {
      localStorage.setItem("accessToken", token);
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberedIdentifier", identifier);
      localStorage.setItem("rememberedPassword", btoa(password));
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedIdentifier");
      localStorage.removeItem("rememberedPassword");
      sessionStorage.setItem("accessToken", token);
    }
    setUser(currentUser);
  }

  function updateUser(currentUser) {
    setUser(currentUser);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    updateUser,
    logout,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }

  return context;
}
