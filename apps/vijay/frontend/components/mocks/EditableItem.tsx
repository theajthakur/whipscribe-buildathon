"use client"
import { useState } from "react"
import { Pencil, Trash2, RefreshCw, Check } from "lucide-react"
import { TimestampChip } from "./TimestampChip"

interface EditableItemProps {
  type: string
  text: string
  time: string
}

export function EditableItem({ type, text, time }: EditableItemProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Review · edit anything
        </p>
      </div>
      <div className="p-3 space-y-2">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground">{type}</span>
                <TimestampChip time={time} />
              </div>
              {editing ? (
                <textarea
                  className="w-full rounded bg-muted px-2 py-1.5 text-sm text-foreground resize-none border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  value={value}
                  rows={2}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-foreground">{value}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              {editing ? (
                <button
                  onClick={() => setEditing(false)}
                  className="rounded p-1.5 text-success hover:bg-success/10 transition-colors"
                  aria-label="Save"
                >
                  <Check size={13} />
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                className="rounded p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
              <button
                className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border p-3 opacity-50">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">Timeline</span>
            <TimestampChip time="1:45" />
          </div>
          <p className="text-sm text-foreground">Delivery: 3 weeks from sign-off</p>
        </div>
      </div>
    </div>
  )
}
