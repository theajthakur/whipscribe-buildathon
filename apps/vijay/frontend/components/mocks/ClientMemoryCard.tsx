import { Badge } from "@/components/ui/Badge"
import { ArrowDown } from "lucide-react"

export function ClientMemoryCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Client memory · Priya&apos;s Salon
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">
              2 months ago · Discovery call
            </span>
            <Badge variant="muted">Agreed</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Online booking, Google Calendar, mobile-first. Budget ₹35k.
          </p>
        </div>

        <div className="flex justify-center text-muted-foreground">
          <ArrowDown size={15} />
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">
              Today · Change request
            </span>
            <Badge variant="warning">New scope</Badge>
          </div>
          <p className="text-sm text-foreground">
            Adding staff profiles and an Instagram feed — not in the original brief.
          </p>
        </div>
      </div>
    </div>
  )
}
