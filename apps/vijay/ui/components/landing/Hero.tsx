"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 1.0, delay: 0.1 }
      )
        .fromTo(
          subtextRef.current,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.6"
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5"
        )
        .fromTo(
          vizRef.current,
          { opacity: 0, y: 30, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
          "-=0.4"
        );

      // Subtle ambient waveform bar pulsing animation
      if (waveformRef.current) {
        const bars = waveformRef.current.querySelectorAll(".wave-bar");
        gsap.to(bars, {
          scaleY: "random(0.3, 1.2)",
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.08,
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center pt-32 pb-20 px-6 max-w-5xl mx-auto border-b border-border/40"
    >
      {/* Background ambient lighting — very restrained */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-foreground/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Hero Content */}
      <div className="flex flex-col items-center text-center space-y-8 z-10">
        <h1
          ref={headlineRef}
          className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground max-w-3xl leading-[1.08]"
        >
          Your client call already contains the plan.
        </h1>

        <p
          ref={subtextRef}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed"
        >
          CallBrief turns conversations into clear requirements, tasks,
          estimates, and client-ready work.
        </p>

        <div
          ref={ctaRef}
          className="flex flex-col sm:flex-row items-center gap-4 pt-2"
        >
          <a
            href="#workspace"
            className="w-full sm:w-auto px-6 py-3.5 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-all duration-150 flex items-center justify-center gap-2 text-base"
          >
            Start building →
          </a>
          <a
            href="#problem"
            className="w-full sm:w-auto px-6 py-3.5 rounded-md border border-border bg-card text-foreground font-medium hover:bg-secondary transition-all duration-150 text-base"
          >
            See how it works
          </a>
        </div>

        {/* Elegant Abstract Product Visualization */}
        <div
          ref={vizRef}
          className="w-full max-w-3xl mt-16 p-6 sm:p-8 rounded-xl bg-card/60 border border-border/60 text-left font-mono text-sm space-y-6 shadow-2xl backdrop-blur-sm"
        >
          {/* Top: Transcript snippet with waveform */}
          <div className="space-y-3 border-b border-border/40 pb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2 font-sans font-medium uppercase tracking-wider text-[11px]">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Audio Recording Snippet
              </span>
              <div ref={waveformRef} className="flex items-center gap-1 h-4">
                <div className="wave-bar w-0.5 h-full bg-muted-foreground/60 rounded-full" />
                <div className="wave-bar w-0.5 h-full bg-muted-foreground/60 rounded-full" />
                <div className="wave-bar w-0.5 h-full bg-muted-foreground/60 rounded-full" />
                <div className="wave-bar w-0.5 h-full bg-muted-foreground/60 rounded-full" />
                <div className="wave-bar w-0.5 h-full bg-muted-foreground/60 rounded-full" />
              </div>
            </div>
            <p className="text-foreground/90 italic font-sans text-base">
              &ldquo;we&apos;ll need the website redesigned, and probably payments
              too...&rdquo;
            </p>
          </div>

          {/* Transition indicator */}
          <div className="flex justify-center -my-3">
            <div className="text-muted-foreground text-xs font-sans tracking-widest uppercase flex items-center gap-2 bg-card px-3 py-1 rounded-full border border-border/60">
              <span>Transforming</span>
              <span>↓</span>
            </div>
          </div>

          {/* Bottom: Extracted Brief structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans">
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Requirements
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
                  Website redesign
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
                  Payment integration
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Tasks
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
                  Design new pages
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
                  Implement checkout
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
