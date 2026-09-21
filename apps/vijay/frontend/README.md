# CallBrief Frontend

The Next.js 16 (App Router) web application for **CallBrief** — the AI client call assistant for freelancers.

## 🚀 Stack & Technologies

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Styling**: Tailwind CSS v4 with custom CSS token system (`globals.css`)
- **Typography**: Sora (headings), Figtree (body), IBM Plex Mono (transcripts & timestamps)
- **Animations**: GSAP & `@gsap/react` for hero timelines and pinned scroll steps
- **Authentication**: `@clerk/nextjs` with custom modal authentication flow (`AuthModal.tsx` & `AuthModalContext.tsx`) and unblocked public landing page
- **Icons**: Lucide React

## 📁 Architecture Overview

```text
frontend/
├── app/
│   ├── dashboard/       # Protected workspace dashboard
│   ├── sso-callback/    # Google SSO OAuth redirect handler
│   ├── globals.css      # CSS variables & design tokens
│   ├── layout.tsx       # Root layout with Clerk & AuthModalProvider
│   └── page.tsx         # Main landing page
├── components/
│   ├── auth/            # AuthModal, AuthCta, AuthModalContext
│   ├── landing/         # Hero, CallTypes, HowItWorks, FeatureShowcase, FinalCta
│   ├── layout/          # Navbar, Footer, NavAuth
│   ├── mocks/           # Interactive UI panels (TranscriptPanel, BriefPanel, etc.)
│   ├── motion/          # GSAP animation hooks and PinnedSteps scroll container
│   └── ui/              # Design primitives (Button, Heading, Container, Section)
├── data/                # Mock data & features registry
└── lib/                 # Utilities (cn.ts, gsap.ts)
```

## 🔐 Auth & Navigation Flow

- **Public Landing Page**: `/` is open to everyone without blocking authentication modals or redirects.
- **Custom Auth Modal**: Clicking "Sign In", "Start Free Trial", or any CTA opens a unified custom auth modal dialog supporting Google SSO and email/password credentials.
- **Protected Workspace**: Authenticated users access `/dashboard` where they can manage call recordings, inspect AI-generated briefs, and edit timestamped action items.

## 🛠️ Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
