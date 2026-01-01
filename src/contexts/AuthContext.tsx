"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextValue {
    token: string | null;
    setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue>({ token: null, setToken: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setTokenState] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("token");
            if (stored) setTokenState(stored);
        }
    }, []);

    const setToken = (value: string | null) => {
        if (typeof window !== "undefined") {
            if (value) {
                localStorage.setItem("token", value);
            } else {
                localStorage.removeItem("token");
            }
        }
        setTokenState(value);
    };

    return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
