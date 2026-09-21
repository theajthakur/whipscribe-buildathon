export type CallTypeColor = "success" | "primary" | "warning" | "muted"

export interface CallType {
  id: string
  label: string
  description: string
  output: string
  color: CallTypeColor
}

export const callTypes: CallType[] = [
  {
    id: "discovery",
    label: "First call",
    description: "New client, first conversation.",
    output: "Brief, tasks, timeline, quote range, confirm message.",
    color: "success",
  },
  {
    id: "inquiry",
    label: "Service inquiry",
    description: "'Do you build X? What does it cost?'",
    output: "Short summary, rough price, lead note, follow-up draft.",
    color: "primary",
  },
  {
    id: "change",
    label: "Change request",
    description: "Client asks for additions or changes.",
    output: "Diff against the brief, scope flag, updated tasks and price.",
    color: "warning",
  },
  {
    id: "other",
    label: "Other",
    description: "Unclear or off-topic.",
    output: "Summary and action items only — asks what to do next.",
    color: "muted",
  },
]
