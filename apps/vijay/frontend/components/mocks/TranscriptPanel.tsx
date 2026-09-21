"use client"
import { cn } from "@/lib/cn"
import type { TranscriptLine } from "@/data/mockContent"

interface TranscriptPanelProps {
  lines: TranscriptLine[]
  activeLineId?: string | null
}

export function TranscriptPanel({ lines, activeLineId }: TranscriptPanelProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      aria-label="Call transcript"
    >
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Transcript · discovery call · 4 min
        </p>
      </div>
      <div className="p-3 space-y-1.5">
        {lines.map((line) => (
          <div
            key={line.id}
            data-line-id={line.id}
            className={cn(
              "rounded-md px-3 py-2 transition-all duration-300",
              line.highlighted && "bg-accent/20",
              activeLineId === line.id &&
                "bg-accent/60 scale-[1.01] shadow-sm",
            )}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {line.speaker}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {line.time}
              </span>
            </div>
            <p
              className={cn(
                "font-mono text-sm leading-relaxed",
                line.highlighted
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {line.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
