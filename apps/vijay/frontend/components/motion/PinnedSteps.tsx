"use client"
import { cn } from "@/lib/cn"
import { useScrollScene } from "./useScrollScene"
import type { ReactNode } from "react"

export interface PinnedStep {
  id: string
  number: number
  heading: string
  description: string
  mockNode: ReactNode
}

interface PinnedStepsProps {
  steps: PinnedStep[]
}

export function PinnedSteps({ steps }: PinnedStepsProps) {
  const { containerRef, activeStep } = useScrollScene(steps.length)

  return (
    <div
      ref={containerRef}
      style={{ height: `${steps.length * 100}vh` }}
      className="relative"
      aria-label="How it works — scroll to advance"
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left: step list */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-4 rounded-xl p-4 transition-all duration-300",
                    i === activeStep
                      ? "bg-card border border-border shadow-sm"
                      : "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "rounded-full font-mono text-sm font-bold transition-colors duration-300",
                      i === activeStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.number}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{step.heading}</p>
                    {i === activeStep && (
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: mock screen for active step */}
            <div className="relative min-h-[320px]">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    "transition-all duration-500",
                    i === activeStep
                      ? "opacity-100 translate-y-0 relative"
                      : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none",
                  )}
                  aria-hidden={i !== activeStep}
                >
                  {step.mockNode}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
