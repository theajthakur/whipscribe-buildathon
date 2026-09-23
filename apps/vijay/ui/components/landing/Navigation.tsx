"use client";

import React from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useAuthModal } from "@/components/auth/AuthContext";

export function Navigation() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openAuthModal } = useAuthModal();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 transition-all duration-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Mark */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-5 h-5 rounded-sm bg-foreground flex items-center justify-center text-background font-mono font-bold text-xs">
            C
          </div>
          <span className="font-semibold text-foreground tracking-tight text-lg">
            CallBrief
          </span>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="#product"
            className="hover:text-foreground transition-colors duration-150"
          >
            Product
          </a>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors duration-150"
          >
            How it works
          </a>
          <a
            href="#workspace"
            className="hover:text-foreground transition-colors duration-150"
          >
            Workspace
          </a>
        </nav>

        {/* Right Authentication & Profile Actions */}
        <div className="flex items-center gap-4 text-sm font-medium">
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-all duration-150"
              >
                Workspace →
              </a>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full border border-border/60",
                  },
                }}
              />
            </div>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("sign-in")}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                Sign in
              </button>
              <button
                onClick={() => openAuthModal("sign-up")}
                className="px-4 py-2 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-all duration-150"
              >
                Start building →
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
