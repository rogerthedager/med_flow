import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import apiClient from "../api/client.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "medFlowToken";

function decodeValidToken(token) {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "=",
    );

    const bytes = Uint8Array.from(
      atob(padded),
      (character) => character.charCodeAt(0),
    );

    const payload = JSON.parse(new TextDecoder().decode(bytes));

    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY),
  );

  const user = useMemo(() => decodeValidToken(token), [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  // 页面打开期间，令牌到期后自动退出。
  useEffect(() => {
    if (!token) return;

    if (!user) {
      logout();
      return;
    }

    const timer = window.setTimeout(
      logout,
      Math.max(0, user.exp * 1000 - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [token, user, logout]);

  // 后端拒绝当前登录凭证时，返回登录页。
  useEffect(() => {
    window.addEventListener("medflow:unauthorized", logout);

    return () => {
      window.removeEventListener("medflow:unauthorized", logout);
    };
  }, [logout]);

  async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await apiClient.post("/auth/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const nextToken = response.data.access_token;

    if (!decodeValidToken(nextToken)) {
      throw new Error("The server returned an invalid or expired token.");
    }

    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}