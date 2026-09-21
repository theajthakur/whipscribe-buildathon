"use client"

import { useState, FormEvent } from "react"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useAuthModal } from "./AuthModalContext"
import { Button } from "@/components/ui/Button"
import { X, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"

export function AuthModal() {
  const { isOpen, closeAuthModal } = useAuthModal()
  const clerk = useClerk()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState("")

  if (!isOpen) return null

  // Google SSO Handler
  const handleGoogleAuth = async () => {
    if (!clerk || !clerk.client) return
    try {
      setError(null)
      await (clerk.client.signIn as any).authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Google sign in failed. Please try again.")
    }
  }

  // Unified Credential Auth (Try Sign In, fallback to Sign Up)
  const handleCredentialAuth = async (e: FormEvent) => {
    e.preventDefault()
    if (!clerk || !clerk.client) return

    setLoading(true)
    setError(null)

    try {
      // 1. Attempt Sign In first
      const signInAttempt = await (clerk.client.signIn as any).create({
        identifier: email,
        password,
      })

      if (signInAttempt.status === "complete") {
        await clerk.setActive({ session: signInAttempt.createdSessionId })
        closeAuthModal()
        router.push("/dashboard")
        return
      }
    } catch (signInErr: any) {
      const firstErr = signInErr?.errors?.[0]
      const errCode = firstErr?.code
      const errMsg = firstErr?.message || ""

      // If user does not exist, automatically sign them up
      const isUserNotFound =
        errCode === "form_identifier_not_found" ||
        errMsg.toLowerCase().includes("not found") ||
        errMsg.toLowerCase().includes("couldn't find")

      if (isUserNotFound) {
        try {
          const signUpAttempt = await (clerk.client.signUp as any).create({
            emailAddress: email,
            password,
          })

          if (signUpAttempt.status === "complete") {
            await clerk.setActive({ session: signUpAttempt.createdSessionId })
            closeAuthModal()
            router.push("/dashboard")
            return
          } else {
            await (clerk.client.signUp as any).prepareEmailAddressVerification({ strategy: "email_code" })
            setVerifying(true)
            return
          }
        } catch (signUpErr: any) {
          setError(signUpErr?.errors?.[0]?.message || "Could not create account.")
          return
        }
      } else {
        setError(errMsg || "Invalid email or password.")
        return
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle email verification code submission
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!clerk || !clerk.client) return

    setLoading(true)
    setError(null)

    try {
      const verifyAttempt = await (clerk.client.signUp as any).attemptEmailAddressVerification({ code })
      if (verifyAttempt.status === "complete") {
        await clerk.setActive({ session: verifyAttempt.createdSessionId })
        closeAuthModal()
        router.push("/dashboard")
      } else {
        setError("Verification incomplete. Please check the code.")
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid verification code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center space-y-1 mb-6">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-1">
            CallBrief Workspace
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {verifying ? "Verify your email" : "Welcome to CallBrief"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {verifying
              ? `We sent a 6-digit code to ${email}`
              : "Sign in or create your account to continue"}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        {verifying ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <Button size="md" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground font-medium text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-border w-full" />
              <span className="absolute bg-card px-2 text-[11px] font-mono text-muted-foreground uppercase">
                or
              </span>
            </div>

            {/* Credential Single Form */}
            <form onSubmit={handleCredentialAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <Button size="md" className="w-full shadow-md mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-border text-center text-[11px] text-muted-foreground">
          Secured by Clerk • 256-bit SSL Encryption
        </div>
      </div>
    </div>
  )
}
