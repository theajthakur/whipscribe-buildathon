"use client";

import React, { useEffect, useRef, useState } from "react";
import { getGsap } from "@/lib/gsap";

export function WorkspaceShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);

  // State to toggle active timestamp highlight manually or automatically via GSAP
  const [activeTimestamp, setActiveTimestamp] = useState<string>("01:28");

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
          toggleActions: "play none none none",
        },
      });

      tl.fromTo(
        workspaceRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      )
        .fromTo(
          transcriptRef.current,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          briefRef.current,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.6 },
          "-=0.4"
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="workspace"
      className="relative min-h-screen flex flex-col justify-center items-center px-6 py-24 max-w-6xl mx-auto border-b border-border/40"
    >
      <div className="w-full space-y-12">
        {/* Section Headline */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
            One call. One clear brief.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Review audio transcripts synchronized directly with generated
            project requirements and estimates.
          </p>
        </div>

        {/* Application Interface Wrapper */}
        <div
          ref={workspaceRef}
          className="rounded-xl border border-border bg-card/90 shadow-2xl overflow-hidden backdrop-blur-md"
        >
          {/* Top Bar / Window Controls */}
          <div className="h-11 px-4 bg-secondary/60 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
            </div>
            <div className="text-xs font-mono text-muted-foreground font-medium">
              CallBrief Workspace — Client Call #042
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              STATUS: REVIEWING
            </div>
          </div>

          {/* Main Dual Pane View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* Left Pane: Transcript (5 columns) */}
            <div
              ref={transcriptRef}
              className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-border space-y-4"
            >
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">
                <span>TRANSCRIPT</span>
                <span>3 SPEECHES</span>
              </div>

              <div className="space-y-4 text-sm">
                {/* Speech 1 */}
                <div
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    activeTimestamp === "00:42"
                      ? "bg-secondary border-foreground/30"
                      : "border-transparent hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">Client</span>
                    <button
                      onClick={() => setActiveTimestamp("00:42")}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      00:42
                    </button>
                  </div>
                  <p className="text-foreground/90 font-sans">
                    &ldquo;We need a new website for our business...&rdquo;
                  </p>
                </div>

                {/* Speech 2 */}
                <div
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    activeTimestamp === "01:12"
                      ? "bg-secondary border-foreground/30"
                      : "border-transparent hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">Freelancer</span>
                    <button
                      onClick={() => setActiveTimestamp("01:12")}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      01:12
                    </button>
                  </div>
                  <p className="text-foreground/90 font-sans">
                    &ldquo;Do you need online payments integrated?&rdquo;
                  </p>
                </div>

                {/* Speech 3 — Highlighted */}
                <div
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    activeTimestamp === "01:28"
                      ? "bg-secondary border-foreground/40 ring-1 ring-border"
                      : "border-transparent hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Client
                    </span>
                    <button
                      onClick={() => setActiveTimestamp("01:28")}
                      className="text-foreground font-semibold underline underline-offset-2"
                    >
                      01:28
                    </button>
                  </div>
                  <p className="text-foreground font-sans">
                    &ldquo;Yes, definitely. Online payments are a must.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Right Pane: Project Brief Output (7 columns) */}
            <div
              ref={briefRef}
              className="lg:col-span-7 p-6 space-y-6 bg-card/40"
            >
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">
                <span>PROJECT BRIEF</span>
                <span className="text-accent-foreground font-semibold">
                  SYNCED TO AUDIO
                </span>
              </div>

              {/* Requirements List */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Requirements
                </span>
                <div className="space-y-2 font-sans text-sm">
                  <div className="p-3 rounded-lg border border-border/60 bg-card text-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                      Website redesign
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">00:42</span>
                  </div>

                  <div
                    onClick={() => setActiveTimestamp("01:28")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                      activeTimestamp === "01:28"
                        ? "bg-secondary border-foreground/40 ring-1 ring-border"
                        : "border-border/60 bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Online payments
                    </div>
                    <span className="text-xs font-mono text-muted-foreground font-medium">
                      01:28
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Tasks
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-lg border border-border/60 bg-card text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                    Design new pages
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-card text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                    Integrate checkout
                  </div>
                </div>
              </div>

              {/* Estimate Summary */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                    Estimated Effort
                  </span>
                  <span className="text-lg font-semibold font-mono text-foreground">
                    32 hours
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                    Project Quote
                  </span>
                  <span className="text-lg font-semibold font-mono text-foreground">
                    $4,500
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Player / Timeline Bar */}
          <div className="h-12 px-6 bg-secondary/80 border-t border-border flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <button className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">
                ▶
              </button>
              <span className="text-muted-foreground">01:28 / 04:15</span>
            </div>
            <div className="flex-1 max-w-md mx-6 h-1 bg-border rounded-full overflow-hidden">
              <div className="w-[35%] h-full bg-foreground rounded-full" />
            </div>
            <span className="text-muted-foreground hidden sm:inline">
              TIMESTAMP LINKED
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
