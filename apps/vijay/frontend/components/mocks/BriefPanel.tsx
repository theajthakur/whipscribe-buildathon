"use client"
import { cn } from "@/lib/cn"
import { TimestampChip } from "./TimestampChip"
import type { BriefItem } from "@/data/mockContent"

const typeLabel: Record<BriefItem["type"], string> = {
  requirement: "Requirement",
  quote: "Quote",
  task: "Task",
  question: "Open question",
}

interface BriefPanelProps {
  items: BriefItem[]
  activeItemId?: string | null
  onChipClick?: (transcriptRef: string) => void
}

export function BriefPanel({
  items,
  activeItemId,
  onChipClick,
}: BriefPanelProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      aria-label="Generated brief"
    >
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Brief · auto-generated
        </p>
      </div>
      <div className="p-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            data-brief-item={item.id}
            className={cn(
              "rounded-lg border border-border p-3 transition-all duration-200",
              activeItemId === item.id &&
                "border-accent bg-accent/10",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs text-muted-foreground">
                {typeLabel[item.type]}
              </span>
              <TimestampChip
                time={item.time}
                active={activeItemId === item.id}
                onClick={
                  onChipClick
                    ? () => onChipClick(item.transcriptRef)
                    : undefined
                }
              />
            </div>
            <p className="text-sm text-foreground leading-snug">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
