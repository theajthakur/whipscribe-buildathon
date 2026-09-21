"use client"

import { SignIn, SignUp } from "@clerk/nextjs"
import { useAuthModal } from "./AuthModalContext"
import { X } from "lucide-react"

export function AuthModal() {
  const { isOpen, mode, setMode, closeAuthModal } = useAuthModal()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-muted p-1 mb-6 mr-8">
          <button
            onClick={() => setMode("sign-in")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "sign-in"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("sign-up")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "sign-up"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Clerk Auth Component */}
        <div className="flex justify-center">
          {mode === "sign-in" ? (
            <SignIn routing="hash" forceRedirectUrl="/dashboard" />
          ) : (
            <SignUp routing="hash" forceRedirectUrl="/dashboard" />
          )}
        </div>
      </div>
    </div>
  )
}
