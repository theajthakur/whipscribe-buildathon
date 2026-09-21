import { Send } from "lucide-react"

export function MessageDraft() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Confirm with client · draft
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-lg bg-muted/40 p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">
            Hi Priya, just summarising what we discussed:
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Online booking page for the salon, synced with Google Calendar.
            Mobile-first design. Timeline: 3 weeks. Price: ₹35,000.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Can you reply with a quick &lsquo;yes&rsquo; to confirm this is
            correct before we start?
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Edit
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
            <Send size={13} />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
