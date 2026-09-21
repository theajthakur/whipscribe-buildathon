export interface Step {
  id: string
  number: number
  label: string
  heading: string
  description: string
  mockId: string
}

export const steps: Step[] = [
  {
    id: "upload",
    number: 1,
    label: "Upload",
    heading: "Drop the call",
    description:
      "A recording, a voice note, or a WhatsApp chat export. Tick the consent box and you're done.",
    mockId: "upload",
  },
  {
    id: "detect",
    number: 2,
    label: "Detect",
    heading: "Agent reads it",
    description:
      "Classifies the call type and shows confidence before anything runs. Override it if it's wrong.",
    mockId: "intent",
  },
  {
    id: "draft",
    number: 3,
    label: "Draft",
    heading: "Right output for the call",
    description:
      "A discovery call gets a full brief. An inquiry gets a short reply. Nothing is invented.",
    mockId: "brief",
  },
  {
    id: "review",
    number: 4,
    label: "Review",
    heading: "You decide what's final",
    description:
      "Edit any item, delete it, add one, or ask the agent to redo a section. Approve when ready.",
    mockId: "editable",
  },
]
