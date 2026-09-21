"use client"

import { useState } from "react"
import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Badge } from "@/components/ui/Badge"
import { AuthCta } from "@/components/auth/AuthCta"
import { TranscriptPanel } from "@/components/mocks/TranscriptPanel"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { useHeroTimeline } from "@/components/motion/useHeroTimeline"
import { mockTranscript, mockBriefItems } from "@/data/mockContent"
import { Sparkles, ArrowRight, ShieldCheck, FileAudio, Sparkle } from "lucide-react"

export function Hero() {
  const containerRef = useHeroTimeline()
  const [activeLineId, setActiveLineId] = useState<string | null>(null)

  const handleChipClick = (time: string) => {
    const matchedLine = mockTranscript.find((l) => l.timestamp === time)
    if (matchedLine) {
      setActiveLineId(matchedLine.id)
      setTimeout(() => setActiveLineId(null), 3000)
    }
  }

  return (
    <section
      ref={containerRef}
      className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-background"
    >
      <Container>
        {/* Top Centered Hero Copy */}
        <div data-hero-copy className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-6">
          <div data-hero-badge className="inline-flex items-center">
            <Badge variant="primary" className="px-3.5 py-1 text-xs tracking-wider font-mono gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Built for Freelancers & Agencies
            </Badge>
          </div>

          <Heading
            as="h1"
            size="xl"
            className="text-foreground text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] max-w-3xl"
          >
            Turn noisy client calls into clear, reviewable briefs.
          </Heading>

          <p className="text-muted-foreground text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
            Upload call recordings, WhatsApp voice notes, or chat exports. CallBrief detects intent, extracts action items with linked timestamps, and drafts client confirmation messages — all ready for your review.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pt-2">
            <AuthCta size="lg" className="shadow-lg shadow-primary/20 px-8 py-3.5 text-base">
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </AuthCta>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-success" /> No credit card required
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Self-serve & private</span>
            <span className="hidden sm:inline">•</span>
            <span>Instant AI summary</span>
          </div>
        </div>

        {/* Wide Interactive Studio Window Mock */}
        <div className="max-w-5xl mx-auto mt-14 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* macOS window bar */}
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-400/80 inline-block" />
            </div>
            <div className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-2">
              <Sparkle className="w-3.5 h-3.5 text-primary" />
              <span>CallBrief Interactive Demo — Raw Audio vs AI Brief</span>
            </div>
            <div className="w-12" /> {/* Spacer */}
          </div>

          {/* Interactive Split Grid */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card/60">
            {/* Left: Source Transcript */}
            <div data-hero-transcript className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground px-1 pb-1 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-foreground">
                  <FileAudio className="w-3.5 h-3.5 text-primary" />
                  RAW SOURCE TRANSCRIPT
                </span>
                <span className="text-[11px] text-muted-foreground font-sans">02:45 audio</span>
              </div>
              <TranscriptPanel lines={mockTranscript} activeLineId={activeLineId} />
            </div>

            {/* Right: Extracted Scope Brief */}
            <div data-hero-brief className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground px-1 pb-1 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  Generated Scope Brief
                </span>
                <span className="text-[11px] text-primary font-sans">Click timestamp chip to sync</span>
              </div>
              <BriefPanel items={mockBriefItems} onChipClick={handleChipClick} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
