// ---------------------------------------------------------------------------
// Hero mock data
// ---------------------------------------------------------------------------

export interface TranscriptLine {
  id: string
  speaker: "CLIENT" | "FREELANCER"
  text: string
  time: string
  highlighted: boolean
  briefRef?: string
  timestamp?: string
}

export interface BriefItem {
  id: string
  type: "requirement" | "quote" | "task" | "question"
  text: string
  time: string
  transcriptRef: string
}

export const heroTranscript: TranscriptLine[] = [
  {
    id: "t1",
    speaker: "CLIENT",
    text: "We need a booking system for the salon. People call and we miss them.",
    time: "0:23",
    timestamp: "0:23",
    highlighted: false,
  },
  {
    id: "t2",
    speaker: "CLIENT",
    text: "The biggest problem is missed calls when we're busy with customers.",
    time: "0:47",
    timestamp: "0:47",
    highlighted: true,
    briefRef: "b1",
  },
  {
    id: "t3",
    speaker: "FREELANCER",
    text: "Got it. Should it sync with Google Calendar?",
    time: "1:09",
    timestamp: "1:09",
    highlighted: false,
  },
  {
    id: "t4",
    speaker: "CLIENT",
    text: "Yes, and must work on mobile. Most clients book over WhatsApp.",
    time: "1:24",
    timestamp: "1:24",
    highlighted: true,
    briefRef: "b2",
  },
  {
    id: "t5",
    speaker: "CLIENT",
    text: "Budget we're thinking around ₹30,000 to ₹40,000 for the full thing.",
    time: "2:38",
    timestamp: "2:38",
    highlighted: true,
    briefRef: "b3",
  },
]

export const heroBriefItems: BriefItem[] = [
  {
    id: "b1",
    type: "requirement",
    text: "Online booking to replace missed calls",
    time: "0:47",
    transcriptRef: "t2",
  },
  {
    id: "b2",
    type: "requirement",
    text: "Google Calendar sync, mobile-first design",
    time: "1:24",
    transcriptRef: "t4",
  },
  {
    id: "b3",
    type: "quote",
    text: "Budget: ₹30,000–₹40,000",
    time: "2:38",
    transcriptRef: "t5",
  },
]

export const mockTranscript = heroTranscript
export const mockBriefItems = heroBriefItems
