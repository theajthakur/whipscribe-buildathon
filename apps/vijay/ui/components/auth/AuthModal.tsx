"use client";

import React, { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAuthModal } from "./AuthContext";
import { AuthShowcase } from "./AuthShowcase";
import { AuthForm } from "./AuthForm";
import { getGsap } from "@/lib/gsap";
import { X } from "lucide-react";

export function AuthModal() {
  const { isSignedIn } = useAuth();
  const { isOpen, closeAuthModal } = useAuthModal();
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance & Exit Animations
  useEffect(() => {
    if (!isOpen || isSignedIn) return;
    const { gsap } = getGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power2.out" }
      );

      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.97, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power3.out" }
      );
    });

    // Keyboard ESC key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuthModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      ctx.revert();
    };
  }, [isOpen, isSignedIn, closeAuthModal]);

  // Never launch or render modal for signed-in users
  if (!isOpen || isSignedIn) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={closeAuthModal}
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
      />

      {/* Main Modal Box */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md md:max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-2"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border/40"
        >
          <X size={16} />
        </button>

        {/* Left Column: Interactive Product Showcase (Desktop Only) */}
        <AuthShowcase />

        {/* Right Column: Custom Auth Form (Desktop & Mobile) */}
        <AuthForm />
      </div>
    </div>
  );
}
