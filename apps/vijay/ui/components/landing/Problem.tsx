"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";

export function Problem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const fragmentsRef = useRef<HTMLDivElement>(null);
  const resolutionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const fragments = fragmentsRef.current?.querySelectorAll(".fragment-item");
      if (!fragments) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
          end: "bottom 80%",
          scrub: 1,
        },
      });

      // Initial scattered position offsets
      tl.fromTo(
        headlineRef.current,
        { opacity: 0.2, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 }
      );

      // Convergence animation: fragments float in from outer positions to aligned layout
      const positions = [
        { x: -120, y: -40, rotate: -3 },
        { x: 130, y: -20, rotate: 4 },
        { x: -90, y: 30, rotate: -2 },
        { x: 100, y: 50, rotate: 3 },
      ];

      fragments.forEach((frag, idx) => {
        const pos = positions[idx % positions.length];
        tl.fromTo(
          frag,
          {
            opacity: 0,
            x: pos.x,
            y: pos.y,
            rotation: pos.rotate,
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.8,
            stagger: 0.1,
          },
          "<+=0.1"
        );
      });

      // Final resolution statement reveal
      tl.fromTo(
        resolutionRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="problem"
      className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 py-24 max-w-5xl mx-auto border-b border-border/40"
    >
      <div className="text-center space-y-16 w-full max-w-3xl">
        {/* Large Statement */}
        <h2
          ref={headlineRef}
          className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground"
        >
          Client conversations are messy.
        </h2>

        {/* Scattered Conversation Fragments */}
        <div
          ref={fragmentsRef}
          className="relative py-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto"
        >
          <div className="fragment-item p-4 rounded-lg bg-card/80 border border-border/60 text-muted-foreground text-sm font-sans shadow-sm text-left">
            &ldquo;We also need payments.&rdquo;
          </div>
          <div className="fragment-item p-4 rounded-lg bg-card/80 border border-border/60 text-muted-foreground text-sm font-sans shadow-sm text-left">
            &ldquo;Was that included?&rdquo;
          </div>
          <div className="fragment-item p-4 rounded-lg bg-card/80 border border-border/60 text-muted-foreground text-sm font-sans shadow-sm text-left">
            &ldquo;Can you send the estimate?&rdquo;
          </div>
          <div className="fragment-item p-4 rounded-lg bg-card/80 border border-border/60 text-muted-foreground text-sm font-sans shadow-sm text-left">
            &ldquo;Maybe add a dashboard too.&rdquo;
          </div>
        </div>

        {/* Final Resolution Statement */}
        <div ref={resolutionRef} className="pt-6">
          <p className="text-2xl sm:text-4xl font-semibold text-foreground tracking-tight">
            The work shouldn&apos;t be.
          </p>
        </div>
      </div>
    </section>
  );
}
