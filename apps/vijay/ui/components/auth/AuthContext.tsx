"use client";

import React, { createContext, useContext, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "verification";

interface AuthContextType {
  isOpen: boolean;
  mode: AuthMode;
  userEmail: string;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setMode: (mode: AuthMode) => void;
  setUserEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [userEmail, setUserEmail] = useState("");

  const openAuthModal = (initialMode: AuthMode = "sign-in") => {
    if (isSignedIn) {
      window.location.href = "/dashboard";
      return;
    }
    setMode(initialMode);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isOpen: isSignedIn ? false : isOpen,
        mode,
        userEmail,
        openAuthModal,
        closeAuthModal,
        setMode,
        setUserEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthProvider");
  }
  return context;
}
