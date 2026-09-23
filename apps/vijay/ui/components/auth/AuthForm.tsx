"use client";

import React, { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useAuthModal } from "./AuthContext";
import { getClerkErrorMessage } from "@/lib/clerkErrors";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function AuthForm() {
  const { mode, setMode, userEmail, setUserEmail, closeAuthModal } = useAuthModal();
  const { client, setActive } = useClerk();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch mode helper preserving email
  const handleSwitchMode = (newMode: "sign-in" | "sign-up" | "forgot-password") => {
    setError(null);
    setUserEmail(email);
    setMode(newMode);
  };

  // Google OAuth Handler
  const handleGoogleAuth = async () => {
    if (!client?.signIn) return;
    setError(null);
    setIsLoading(true);

    try {
      await client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      setIsLoading(false);
      setError(getClerkErrorMessage(err));
    }
  };

  // Sign In Handler
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.signIn || !setActive) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await client.signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        closeAuthModal();
        window.location.href = "/dashboard";
      } else {
        setIsLoading(false);
        setError("Sign in challenge required. Please follow instructions.");
      }
    } catch (err) {
      setIsLoading(false);
      setError(getClerkErrorMessage(err));
    }
  };

  // Sign Up Handler
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.signUp) return;

    setError(null);
    setIsLoading(true);

    try {
      const names = fullName.trim().split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "";

      await client.signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      // Prepare email verification
      await client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setUserEmail(email);
      setIsLoading(false);
      setMode("verification");
    } catch (err) {
      setIsLoading(false);
      setError(getClerkErrorMessage(err));
    }
  };

  // Verification Code Handler
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.signUp || !setActive) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await client.signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        closeAuthModal();
        window.location.href = "/dashboard";
      } else {
        setIsLoading(false);
        setError("Verification incomplete. Please check the code.");
      }
    } catch (err) {
      setIsLoading(false);
      setError(getClerkErrorMessage(err));
    }
  };

  // Forgot Password Handler
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.signIn) return;

    setError(null);
    setIsLoading(true);

    try {
      const signInAttempt = await client.signIn.create({ identifier: email });
      const resetFactor = signInAttempt.supportedFirstFactors?.find(
        (f) => f.strategy === "reset_password_email_code"
      );

      if (resetFactor && "emailAddressId" in resetFactor) {
        await signInAttempt.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: resetFactor.emailAddressId as string,
        });
        setIsLoading(false);
        alert("Password reset code sent to your email.");
        setMode("sign-in");
      } else {
        setIsLoading(false);
        setError("Password reset is not configured for this account.");
      }
    } catch (err) {
      setIsLoading(false);
      setError(getClerkErrorMessage(err));
    }
  };

  return (
    <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6 w-full max-w-md mx-auto">
      {/* Header Titles */}
      <div className="space-y-1.5">
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "sign-in" && "Welcome back"}
          {mode === "sign-up" && "Create your account"}
          {mode === "verification" && "Check your email"}
          {mode === "forgot-password" && "Reset your password"}
        </h3>
        <p className="text-sm text-muted-foreground font-normal">
          {mode === "sign-in" && "Sign in to continue to your CallBrief workspace."}
          {mode === "sign-up" && "Start turning client calls into clear project work."}
          {mode === "verification" && `We sent a verification code to ${email}`}
          {mode === "forgot-password" && "Enter the email associated with your account."}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-sans font-medium">
          {error}
        </div>
      )}

      {/* Sign In Form */}
      {mode === "sign-in" && (
        <form onSubmit={handleSignInSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground block">
                Password
              </label>
              <button
                type="button"
                onClick={() => handleSwitchMode("forgot-password")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      )}

      {/* Sign Up Form */}
      {mode === "sign-up" && (
        <form onSubmit={handleSignUpSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Full name
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Vijay Singh"
              className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      )}

      {/* Verification Code Form */}
      {mode === "verification" && (
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Verification code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-center font-mono tracking-widest text-lg focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify"
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <button
              type="button"
              onClick={() => handleSwitchMode("sign-up")}
              className="hover:text-foreground underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {/* Forgot Password Form */}
      {mode === "forgot-password" && (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-md bg-secondary/80 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending code...</span>
              </>
            ) : (
              "Send reset code"
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode("sign-in")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            Back to sign in
          </button>
        </form>
      )}

      {/* Divider & Google OAuth (Only for sign-in and sign-up) */}
      {(mode === "sign-in" || mode === "sign-up") && (
        <div className="space-y-4 pt-1">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <span className="relative px-3 bg-card text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-md border border-border bg-secondary/60 text-foreground font-medium text-sm hover:bg-secondary transition-all flex items-center justify-center gap-3"
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
            <span>
              {isLoading ? "Connecting..." : "Continue with Google"}
            </span>
          </button>

          {/* Footer Switch Link */}
          <div className="text-center text-xs text-muted-foreground pt-2 font-sans">
            {mode === "sign-in" ? (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("sign-up")}
                  className="text-foreground font-semibold hover:underline"
                >
                  Create account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("sign-in")}
                  className="text-foreground font-semibold hover:underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
