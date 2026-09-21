import { Badge } from "@/components/ui/Badge"

const tools = [
  { name: "Trello", abbr: "T" },
  { name: "Notion", abbr: "N" },
  { name: "WhatsApp", abbr: "W" },
]

export function ToolList() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Integrations · coming soon
        </p>
      </div>
      <div className="p-3 divide-y divide-border">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="flex items-center justify-between py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {tool.abbr}
                </span>
              </div>
              <span className="text-sm text-foreground">{tool.name}</span>
            </div>
            <Badge variant="muted">Soon</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
