"use client";

import React, { useEffect, useRef, useState } from "react";
import { getGsap } from "@/lib/gsap";

export function HumanReview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  const [stage, setStage] = useState<"initial" | "editing" | "approved">("initial");

  useEffect(() => {
    const { gsap } = getGsap();
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 65%",
          end: "bottom 75%",
          onEnter: () => setStage("initial"),
        },
      });

      tl.to({}, { duration: 0.8, onComplete: () => setStage("editing") })
        .to({}, { duration: 1.2, onComplete: () => setStage("approved") });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="human-review"
      className="relative min-h-[70vh] flex flex-col justify-center items-center px-6 py-20 max-w-5xl mx-auto border-b border-border/40"
    >
      <div className="w-full max-w-3xl text-center space-y-12">
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
          AI does the work. You make the call.
        </h2>

        {/* Interactive Editing UI Card */}
        <div
          ref={itemRef}
          className="max-w-xl mx-auto p-6 rounded-xl bg-card border border-border text-left space-y-4 shadow-lg transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              REQUIREMENT #03
            </span>
            <div className="flex items-center gap-2">
              {stage === "approved" ? (
                <span
                  ref={badgeRef}
                  className="px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-mono font-medium flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Approved
                </span>
              ) : (
                <button
                  onClick={() =>
                    setStage((prev) =>
                      prev === "initial"
                        ? "editing"
                        : prev === "editing"
                        ? "approved"
                        : "initial"
                    )
                  }
                  className="text-xs font-mono px-2.5 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {stage === "initial" ? "[ Edit ]" : "[ Save ]"}
                </button>
              )}
            </div>
          </div>

          <div className="pt-1">
            <p
              ref={textRef}
              className={`text-lg font-medium transition-all duration-300 font-sans ${
                stage === "approved"
                  ? "text-foreground"
                  : stage === "editing"
                  ? "text-foreground font-semibold ring-1 ring-border p-2 rounded bg-secondary/50"
                  : "text-foreground"
              }`}
            >
              {stage === "initial"
                ? "Customer dashboard"
                : "Customer dashboard with order history"}
            </p>
          </div>

          <div className="text-xs text-muted-foreground font-mono pt-2 border-t border-border/40 flex justify-between">
            <span>Human-in-the-loop review</span>
            <span>Nothing sent without your approval</span>
          </div>
        </div>
      </div>
    </section>
  );
}
