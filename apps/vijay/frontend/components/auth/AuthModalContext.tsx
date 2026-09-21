"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type AuthMode = "sign-in" | "sign-up"

interface AuthModalContextType {
  isOpen: boolean
  mode: AuthMode
  openAuthModal: (mode?: AuthMode) => void
  closeAuthModal: () => void
  setMode: (mode: AuthMode) => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>("sign-in")

  const openAuthModal = (initialMode: AuthMode = "sign-in") => {
    setMode(initialMode)
    setIsOpen(true)
  }

  const closeAuthModal = () => {
    setIsOpen(false)
  }

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        openAuthModal,
        closeAuthModal,
        setMode,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider")
  }
  return context
}
