"use client"

import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Section } from "@/components/ui/Section"
import { Reveal } from "@/components/motion/Reveal"
import { features, soonFeatures, Feature } from "@/data/features"
import { UploadMock } from "@/components/mocks/UploadMock"
import { IntentBadge } from "@/components/mocks/IntentBadge"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { TranscriptPanel } from "@/components/mocks/TranscriptPanel"
import { EditableItem } from "@/components/mocks/EditableItem"
import { ClientMemoryCard } from "@/components/mocks/ClientMemoryCard"
import { MessageDraft } from "@/components/mocks/MessageDraft"
import { ToolList } from "@/components/mocks/ToolList"
import { mockTranscript, mockBriefItems } from "@/data/mockContent"

function renderFeatureMock(mockId: string) {
  switch (mockId) {
    case "upload":
      return <UploadMock />
    case "intent":
      return <IntentBadge />
    case "brief":
      return <BriefPanel items={mockBriefItems} />
    case "transcript":
      return <TranscriptPanel lines={mockTranscript.slice(0, 3)} />
    case "editable":
      return (
        <div className="space-y-3">
          <EditableItem
            type="requirement"
            text="Add multi-currency billing support (USD, EUR, GBP)"
            time="02:14"
          />
          <EditableItem
            type="quote"
            text="Estimated timeline: 3 weeks @ $120/hr"
            time="05:40"
          />
        </div>
      )
    case "memory":
      return <ClientMemoryCard />
    case "message":
      return <MessageDraft />
    default:
      return <UploadMock />
  }
}

export function FeatureShowcase() {
  return (
    <Section bg="default" id="features">
      <Container>
        <div className="max-w-3xl mb-16 text-left">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-2 block">
            Feature Deep Dive
          </span>
          <Heading as="h2" size="lg" className="mb-4">
            Designed for real freelance workflows
          </Heading>
          <p className="text-muted-foreground text-lg">
            Every feature focuses on saving time, eliminating client misunderstandings, and providing proof for scope boundaries.
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-24">
          {features.map((feature: Feature, idx: number) => {
            const isTextLeft = feature.layout === "text-left"

            return (
              <Reveal key={feature.id} delay={0.1}>
                <div
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
                    isTextLeft ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Copy */}
                  <div
                    className={`lg:col-span-5 ${
                      isTextLeft ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider mb-2 block">
                      Feature 0{idx + 1}
                    </span>
                    <Heading as="h3" size="md" className="mb-4">
                      {feature.title}
                    </Heading>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* UI Mock Panel */}
                  <div
                    className={`lg:col-span-7 ${
                      isTextLeft ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm hover:border-primary/30 transition-colors">
                      {renderFeatureMock(feature.mockId)}
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-28 pt-16 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-warning mb-2 block">
                Roadmap
              </span>
              <Heading as="h3" size="md" className="mb-3">
                Integrations coming soon
              </Heading>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Approved tasks will push directly into Trello boards, Notion databases, or WhatsApp messages — automatically learning your styling preferences over time.
              </p>
              <div className="space-y-3">
                {soonFeatures.map((sf) => (
                  <div key={sf.id} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                    <div>
                      <span className="font-semibold text-sm text-foreground">{sf.title}: </span>
                      <span className="text-xs text-muted-foreground">{sf.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-7">
              <ToolList />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
