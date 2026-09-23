"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";
import { useAuthModal } from "@/components/auth/AuthContext";

export function FinalCta() {
  const { openAuthModal } = useAuthModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const ctaContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ctaContentRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={containerRef}
      className="relative min-h-[85vh] flex flex-col justify-between px-6 pt-24 pb-12 max-w-5xl mx-auto"
    >
      {/* Centered CTA Block */}
      <div
        ref={ctaContentRef}
        className="my-auto flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto"
      >
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-foreground leading-tight">
          Make every client call count.
        </h2>

        <p className="text-lg sm:text-xl text-muted-foreground font-normal">
          Turn your next conversation into clear, actionable work.
        </p>

        <div className="pt-2">
          <button
            onClick={() => openAuthModal("sign-up")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-all duration-150 text-base shadow-lg"
          >
            Start with your next call →
          </button>
        </div>
      </div>

      {/* Subtle Footer Bar */}
      <div className="w-full pt-16 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-foreground flex items-center justify-center text-background font-mono font-bold text-[10px]">
            C
          </div>
          <span className="font-sans font-semibold text-foreground tracking-tight text-sm">
            CallBrief
          </span>
          <span className="text-muted-foreground/60 ml-2">
            · Powered by WhipScribe transcription
          </span>
        </div>

        <nav className="flex items-center gap-6 font-sans">
          <a href="#product" className="hover:text-foreground transition-colors">
            Product
          </a>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <button
            onClick={() => openAuthModal("sign-in")}
            className="hover:text-foreground transition-colors"
          >
            Sign in
          </button>
        </nav>

        <div>© 2026 CallBrief</div>
      </div>
    </footer>
  );
}
