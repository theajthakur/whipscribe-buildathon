# Freelancer Call Assistant — CallBrief

**Track 4 — Invent a workflow** · WhipScribe Buildathon · Vijay Singh

A freelancer uploads a client call recording, voice note, or WhatsApp chat export. An agent works out what kind of call it was, uses tools to produce the right output — brief, tasks, quote, reply message — and the freelancer reviews and edits everything before anything is saved or sent. Every item links to the exact moment in the recording it came from.

---

## The problem

**The person:** A freelance web developer taking calls with small-business clients — discovery calls, service inquiries, change requests, status checks.

**Their day today:**

- Client calls happen over WhatsApp voice or regular calls.
- Notes are written in a physical notebook during the call. WhatsApp chat is re-read after to find what the client actually asked for.
- Requirements are figured out by memory and rereading. Brief and quote are written manually from scratch.
- Gathering missing information, getting pricing right, following up before sending the quote — all done by hand, every time.
- There is no single record of what was agreed.

**The cost:**

- Hours of admin per call — notes, brief, quote, follow-up message.
- Requirements missed or misremembered.
- Scope creep with no evidence to refer back to.
- "You never said that" disputes at delivery — even sending a voice recording of the scope discussion didn't stop it.
- Slow quote turnaround loses leads.

**Why recordings are the way in:** the client's own words are the only source of truth that both sides agreed to at the time.

**Why not one fixed template:** a discovery call needs a full plan; a quick inquiry needs a short reply and a lead note; a change request needs a comparison with what was already agreed. A tool that does the same thing for every call is wrong for most of them.

---

## What a real freelancer told me

*I am the freelancer. These are my own answers, from working with clients for the past few years.*

**How the workflow works today:**
> "I contact clients through WhatsApp chat and voice calls — mostly WhatsApp chats. During the call I note points in a notebook. After the conversation I re-read the chat and find what the tasks are and what the client's requirement is, then I start working."

**The most painful part between call and quote:**
> - Turning messy call notes into a clear brief
> - Figuring out exactly what the client wants
> - Gathering missing information from the client
> - Creating the proposal and quote manually
> - Getting internal approval or pricing right
> - Following up with the client before the quote is even sent

**"You never said that" moments:**
> "Yes, many times. After I deliver the project the client says 'this is what I also told you.' I send them the voice recording about scope — and we still get into a dispute."

**What the tool should give after processing a call:**
> "A brief summarising what the client wants, a list of tasks and action items, and a draft message I can send to the client."

---

## Workflow

![Freelancer Call Assistant — Workflow](./workflow.png)

```mermaid
flowchart TD
    A([🎙️ Upload Recording\nAudio / video + consent checkbox]) --> B

    B[["🔵 WhipScribe API\nTranscription with speakers & timestamps\n— API call —"]]
    B --> C

    C[["🟠 Router Agent\nClassifies intent + confidence + one-line reason\n— LLM —"]]
    C --> D{Confidence OK?}

    D -- Yes --> E
    D -- No --> F["🙋 Show top choices\nFreelancer picks intent"]
    F --> E

    E{Detected intent}

    E -- Discovery --> P1["🟢 Discovery Playbook\nGoals · features · tasks\ntimeline · quote · message"]
    E -- Inquiry --> P2["🔵 Inquiry Playbook\nSummary · price answer\nlead note · follow-up"]
    E -- Change request --> P3["🟡 Change Request Playbook\nCompare with brief\nscope-creep flag · updated tasks"]
    E -- Other / unclear --> P4["🔴 Other Fallback\nShort summary · action items\nAsk freelancer what to do"]

    P1 & P2 & P3 & P4 --> T

    T[["⚙️ Agent Tool Loop\nget_transcript · extract_requirements · create_tasks\nestimate_timeline_and_quote · draft_client_message · save_lead_note\n— capped tool calls, every item gets a timestamp —"]]
    T --> R

    R[["🧑‍💻 Review Screen\nProposal shown section by section\nEach item: timestamp link + Edit / Delete / Add / Regenerate\n— Human in the loop — nothing is final yet —"]]
    R --> G

    G([✅ Approved Output\nSaved under Client → Project\nExternal actions fire only after approval])
```

---

## Architecture & Project Structure

```text
apps/vijay/
├── backend/
│   ├── whipscribe/      # Python SDK client for WhipScribe API
│   │   ├── _http.py     # HTTP transport layer
│   │   ├── account.py   # Account & balance endpoints
│   │   ├── clips.py     # Audio clips & transcription endpoints
│   │   └── client.py    # Main WhipScribeClient entrypoint
│   └── .env             # Backend environment settings
├── frontend/
│   ├── app/             # Next.js App Router (Landing, Workspace, SSO Callback)
│   ├── components/      # UI primitives, AuthModal, Hero, Mocks, Motion components
│   ├── data/            # Features, steps, and call type definitions
│   └── lib/             # Utility helpers
├── README.md
└── scope.md             # Project scope & specifications
```

---

## How to run

### Frontend Web App
```bash
cd apps/vijay/frontend
npm install
npm run dev
```

### Backend WhipScribe Client
```bash
cd apps/vijay/backend
python -m pip install -r requirements.txt
```

---

## What works right now

- [x] **WhipScribe API Client Module**: Python API client (`whipscribe` package) supporting file uploads, job polling, transcript retrieval, and balance checking.
- [x] **Next.js 16 Web Application**: Built using App Router, Tailwind CSS v4, Sora & Figtree typography, and custom CSS design tokens.
- [x] **Interactive Hero & Demo Showcase**: Side-by-side studio app window showing raw source transcripts synced live with generated scope briefs.
- [x] **Adaptive Call Types & Workflow**: Features adaptive call classification, pinned scroll steps, and live product mock panels.
- [x] **Modal Authentication System**: Unblocked public landing page with a custom single-form auth modal dialog supporting Google SSO and email/password credentials via Clerk.
- [x] **Workspace Dashboard**: Protected workspace route (`/dashboard`) for managing incoming audio clips and reviewable briefs.

---

## Vision

A year from now, if this works:

- **More call types:** status calls, feedback calls, payment follow-ups, onboarding calls.
- **More tools:** Notion, Trello, Linear, calendar, invoicing, WhatsApp — each as one small file added to the tool registry.
- **Learns your style:** keeps your past edits and uses them as examples, so outputs match your tone over time.
- **Client approval page:** client confirms the brief with one click — both sides signed off, disputes resolved before they start.
- **Scope-creep alerts** across the whole project history, not just one call.
- **Teams:** agencies sharing client history across developers.
