import { cn } from "@/lib/cn"
import { Badge } from "@/components/ui/Badge"
import type { CallTypeColor } from "@/data/callTypes"

interface Intent {
  label: string
  confidence: number
  color: CallTypeColor
  selected: boolean
}

const intents: Intent[] = [
  { label: "First discovery call", confidence: 87, color: "success", selected: true },
  { label: "Service inquiry", confidence: 10, color: "primary", selected: false },
  { label: "Other", confidence: 3, color: "muted", selected: false },
]

const barColor: Record<CallTypeColor, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  muted: "bg-muted-foreground/40",
}

export function IntentBadge() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Call type · detected
        </p>
      </div>
      <div className="p-4 space-y-3">
        {intents.map((intent) => (
          <div key={intent.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={intent.color}>{intent.label}</Badge>
                {intent.selected && (
                  <span className="text-xs text-muted-foreground">selected</span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {intent.confidence}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor[intent.color])}
                style={{ width: `${intent.confidence}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Not right?{" "}
          <span className="text-primary underline underline-offset-2 cursor-pointer">
            Change it
          </span>
        </p>
      </div>
    </div>
  )
}
