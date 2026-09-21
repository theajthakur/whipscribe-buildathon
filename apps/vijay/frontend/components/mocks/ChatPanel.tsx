import { cn } from "@/lib/cn"

interface ChatMessage {
  id: string
  from: "client" | "me"
  text: string
  time: string
}

const messages: ChatMessage[] = [
  {
    id: "m1",
    from: "client",
    text: "Hi, are you free to discuss a website for my salon?",
    time: "10:12",
  },
  {
    id: "m2",
    from: "me",
    text: "Sure! Tell me what you need.",
    time: "10:13",
  },
  {
    id: "m3",
    from: "client",
    text: "Mainly for bookings. We miss calls when we're with customers 😅",
    time: "10:14",
  },
  {
    id: "m4",
    from: "me",
    text: "Got it. Any budget in mind?",
    time: "10:15",
  },
  {
    id: "m5",
    from: "client",
    text: "Maybe 30–40k? Still working it out",
    time: "10:16",
  },
]

export function ChatPanel() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
          <span className="font-mono text-xs font-bold text-success">P</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground leading-none">
            Priya — salon owner
          </p>
          <p className="font-mono text-xs text-muted-foreground">WhatsApp</p>
        </div>
      </div>
      <div className="p-3 space-y-2.5 max-h-60 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.from === "me" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3 py-2",
                msg.from === "me"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}
            >
              <p className="text-sm">{msg.text}</p>
              <p
                className={cn(
                  "font-mono text-xs mt-1 text-right",
                  msg.from === "me"
                    ? "text-primary-foreground/60"
                    : "text-muted-foreground",
                )}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
