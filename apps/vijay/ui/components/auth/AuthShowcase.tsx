"use client";

import React, { useEffect, useRef, useState } from "react";
import { getGsap } from "@/lib/gsap";

export function AuthShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(0);

  const scenes = [
    {
      step: "01",
      tag: "CLIENT CALL",
      quote: "“We need a new website with online payments integrated for our business...”",
      note: "Audio transcript snippet",
    },
    {
      step: "02",
      tag: "UNDERSTANDING",
      items: ["Website redesign", "Online payments integration"],
      note: "Structured intent classification",
    },
    {
      step: "03",
      tag: "PROJECT PLAN",
      brief: {
        requirements: "2 key requirements",
        tasks: "4 actionable tasks",
        estimate: "32 hours | $4,500",
      },
      note: "Instant scope generation",
    },
    {
      step: "04",
      tag: "HUMAN REVIEW",
      headline: "You stay in control.",
      note: "Nothing is sent without approval",
    },
  ];

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const interval = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % scenes.length);
    }, 3200);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".showcase-card",
        { opacity: 0, y: 12, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" }
      );
    }, containerRef);

    return () => {
      clearInterval(interval);
      ctx.revert();
    };
  }, [activeScene, scenes.length]);

  const current = scenes[activeScene];

  return (
    <div
      ref={containerRef}
      className="hidden md:flex flex-col justify-between p-8 bg-card/60 border-r border-border/60 relative overflow-hidden"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-foreground/5 blur-3xl pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="flex items-center gap-2 z-10">
        <div className="w-5 h-5 rounded-sm bg-foreground flex items-center justify-center text-background font-mono font-bold text-xs">
          C
        </div>
        <span className="font-semibold text-foreground tracking-tight text-sm">
          CallBrief
        </span>
      </div>

      {/* Dynamic Animated Scene Content */}
      <div className="my-auto py-8 space-y-6 z-10">
        <div className="showcase-card space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border/40 pb-2">
            <span className="tracking-wider uppercase font-medium text-foreground">
              {current.tag}
            </span>
          </div>

          {activeScene === 0 && (
            <p className="text-foreground/90 font-sans italic text-base leading-relaxed">
              {current.quote}
            </p>
          )}

          {activeScene === 1 && (
            <div className="space-y-2 font-sans text-sm">
              {current.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-secondary/80 border border-border/60 text-foreground flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {activeScene === 2 && (
            <div className="p-4 rounded-lg bg-secondary/80 border border-border/60 space-y-3 font-mono text-xs text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requirements:</span>
                <span>{current.brief?.requirements}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Tasks:</span>
                <span>{current.brief?.tasks}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/40 font-semibold">
                <span className="text-muted-foreground">Estimate:</span>
                <span>{current.brief?.estimate}</span>
              </div>
            </div>
          )}

          {activeScene === 3 && (
            <div className="space-y-2 pt-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {current.headline}
              </p>
              <p className="text-sm text-muted-foreground font-sans">
                Review, edit, and approve brief items before anything is sent.
              </p>
            </div>
          )}

          <div className="text-[11px] font-mono text-muted-foreground pt-2">
            {current.note}
          </div>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-2 z-10">
        {scenes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveScene(idx)}
            className={`h-1 rounded-full transition-all duration-300 ${
              idx === activeScene
                ? "w-8 bg-foreground"
                : "w-2 bg-border hover:bg-muted-foreground"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
