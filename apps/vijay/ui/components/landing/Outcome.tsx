"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";

export function Outcome() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const items = sequenceRef.current?.querySelectorAll(".seq-step");
      if (!items) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
          toggleActions: "play none none none",
        },
      });

      tl.fromTo(
        items,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }
      ).fromTo(
        statementRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.2"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] flex flex-col justify-center items-center px-6 py-28 max-w-5xl mx-auto border-b border-border/40"
    >
      <div className="w-full max-w-3xl text-center space-y-16">
        {/* Workflow Sequence */}
        <div
          ref={sequenceRef}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs sm:text-sm tracking-widest text-muted-foreground uppercase"
        >
          <span className="seq-step px-4 py-2 rounded bg-card border border-border text-foreground font-semibold">
            CALL
          </span>
          <span className="seq-step text-muted-foreground/60">↓</span>
          <span className="seq-step px-4 py-2 rounded bg-card border border-border text-foreground font-semibold">
            BRIEF
          </span>
          <span className="seq-step text-muted-foreground/60">↓</span>
          <span className="seq-step px-4 py-2 rounded bg-card border border-border text-foreground font-semibold">
            TASKS
          </span>
          <span className="seq-step text-muted-foreground/60">↓</span>
          <span className="seq-step px-4 py-2 rounded bg-card border border-border text-foreground font-semibold">
            QUOTE
          </span>
          <span className="seq-step text-muted-foreground/60">↓</span>
          <span className="seq-step px-4 py-2 rounded bg-card border border-border text-foreground font-semibold">
            CLIENT
          </span>
        </div>

        {/* Large High Impact Statement */}
        <div ref={statementRef} className="space-y-4 pt-4">
          <p className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Less time reconstructing the conversation.
          </p>
          <p className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-muted-foreground leading-[1.15]">
            More time doing the work.
          </p>
        </div>
      </div>
    </section>
  );
}
