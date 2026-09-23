"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";

export function Transformation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const estRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Create pinned scrubbed timeline for desktop/tablet
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // 1. Headline & Pipeline Header
      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5 }
      ).fromTo(
        pipelineRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.2"
      );

      // 2. Transcript appears
      tl.fromTo(
        transcriptRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.6 }
      );

      // 3. Transcript line highlights & requirement appears
      tl.to(transcriptRef.current, {
        borderColor: "oklch(1 0 0 / 25%)",
        backgroundColor: "oklch(0.18 0 0)",
        duration: 0.5,
      }).fromTo(
        reqRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.6 },
        "-=0.2"
      );

      // 4. Task appears
      tl.fromTo(
        taskRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.6 },
        "+=0.2"
      );

      // 5. Estimate appears
      tl.fromTo(
        estRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.6 },
        "+=0.2"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="relative min-h-screen flex flex-col justify-center items-center px-6 py-20 bg-background border-b border-border/40"
    >
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2
            ref={headlineRef}
            className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground"
          >
            From conversation to project.
          </h2>

          {/* Simple horizontal transformation pipeline */}
          <div
            ref={pipelineRef}
            className="inline-flex items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-mono tracking-wider text-muted-foreground pt-2"
          >
            <span className="px-3 py-1 rounded bg-secondary text-foreground">
              CALL
            </span>
            <span>→</span>
            <span className="px-3 py-1 rounded bg-secondary text-foreground">
              UNDERSTAND
            </span>
            <span>→</span>
            <span className="px-3 py-1 rounded bg-secondary text-foreground">
              PROJECT BRIEF
            </span>
          </div>
        </div>

        {/* Transformation Visual Display */}
        <div
          ref={cardRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-6"
        >
          {/* Left: Transcript Source */}
          <div
            ref={transcriptRef}
            className="p-6 rounded-xl bg-card border border-border space-y-3 transition-colors duration-300"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="text-accent-foreground font-semibold">
                CLIENT · 01:42
              </span>
              <span className="text-[11px] bg-secondary px-2 py-0.5 rounded">
                Raw Audio
              </span>
            </div>
            <p className="text-foreground text-base sm:text-lg leading-relaxed font-sans">
              &ldquo;We want customers to be able to pay directly from the
              website.&rdquo;
            </p>
          </div>

          {/* Right: Understood Brief Output */}
          <div className="space-y-4">
            {/* Requirement */}
            <div
              ref={reqRef}
              className="p-5 rounded-xl bg-card/90 border border-border space-y-1.5"
            >
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest block">
                REQUIREMENT
              </span>
              <p className="text-foreground font-medium text-base">
                Accept online payments
              </p>
            </div>

            {/* Task */}
            <div
              ref={taskRef}
              className="p-5 rounded-xl bg-card/90 border border-border space-y-1.5"
            >
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest block">
                TASK
              </span>
              <p className="text-foreground font-medium text-base">
                Implement payment checkout
              </p>
            </div>

            {/* Estimate */}
            <div
              ref={estRef}
              className="p-5 rounded-xl bg-card/90 border border-border space-y-1.5"
            >
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest block">
                ESTIMATE
              </span>
              <p className="text-foreground font-semibold text-lg font-mono">
                8 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
