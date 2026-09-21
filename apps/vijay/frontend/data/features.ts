export type FeatureLayout = "text-left" | "text-right"

export interface Feature {
  id: string
  title: string
  description: string
  mockId: string
  layout: FeatureLayout
}

export interface SoonFeature {
  id: string
  title: string
  description: string
}

export const features: Feature[] = [
  {
    id: "upload",
    title: "Everything in one drop",
    description: "Call recordings, voice notes and WhatsApp chat exports.",
    mockId: "upload",
    layout: "text-left",
  },
  {
    id: "detection",
    title: "Knows what kind of call it was",
    description: "Detects the call type, shows confidence, lets you override before anything runs.",
    mockId: "intent",
    layout: "text-right",
  },
  {
    id: "brief",
    title: "Output fits the call",
    description: "A quick inquiry gets a short reply, not a full project plan.",
    mockId: "brief",
    layout: "text-left",
  },
  {
    id: "timestamps",
    title: "Every item links to its moment",
    description: "Tap any chip to jump to exactly when it was said.",
    mockId: "transcript",
    layout: "text-right",
  },
  {
    id: "review",
    title: "Edit before anything is saved",
    description: "Change, delete, add or ask the agent to redo any item.",
    mockId: "editable",
    layout: "text-left",
  },
  {
    id: "memory",
    title: "Remembers what was agreed",
    description: "Change requests compare against the earlier brief.",
    mockId: "memory",
    layout: "text-right",
  },
  {
    id: "confirm",
    title: "Scope confirmed in writing",
    description: "Draft message ready to send the client.",
    mockId: "message",
    layout: "text-left",
  },
]

export const soonFeatures: SoonFeature[] = [
  {
    id: "tools",
    title: "Trello, Notion, WhatsApp",
    description: "Approved tasks go there directly.",
  },
  {
    id: "learn",
    title: "Learns from your edits",
    description: "Future outputs match your style.",
  },
]
