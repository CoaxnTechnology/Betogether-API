import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // optionally validate token with backend here
      setUser({ role: "admin" });
    } else {
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
    }
  }, [token]);

  /**
   * Attempts to log in. Returns an object:
   * { ok: boolean, status?: number, data?: any, message?: string }
   *
   * Frontend should handle the return to show messages:
   * const res = await login(email, password);
   * if (!res.ok) show res.message
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    // endpoints to try. If your api baseURL already includes /api, the second path will 404,
    // so we try both forms to be tolerant.
    const pathsToTry = ["/admin/login", "/api/admin/login"];

    for (const path of pathsToTry) {
      try {
        const res = await axios.post(path, { email, password });
        // success — expect access_token in response body
        if (res?.data?.access_token) {
          const tokenVal = res.data.access_token;
          setToken(tokenVal);
          localStorage.setItem("token", tokenVal);
          axios.defaults.headers.common["Authorization"] = `Bearer ${tokenVal}`;
          setUser({ role: res.data.role || "admin" });
        }
        setLoading(false);
        return { ok: true, status: res.status, data: res.data };
      } catch (err) {
        // network / server error — inspect
        const status = err?.response?.status;
        // 401 -> unauthorized (bad creds) -> return immediately so UI can show message
        if (status === 401) {
          setLoading(false);
          setError(err?.response?.data?.detail || "Unauthorized");
          return { ok: false, status: 401, message: err?.response?.data?.detail || "Unauthorized" };
        }
        // 404 -> endpoint not found -> try next path
        if (status === 404) {
          // try next endpoint
          // console.warn(`Auth endpoint not found at ${path}, trying next.`);
          continue;
        }
        // other errors (500, network) -> stop and return info
        setLoading(false);
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data ||
          err.message ||
          "Login failed";
        setError(msg);
        return { ok: false, status, message: msg };
      }
    }

    // tried all paths and none worked
    setLoading(false);
    const msg = "Login endpoint not found (tried /admin/login and /api/admin/login)";
    setError(msg);
    return { ok: false, status: 404, message: msg };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
