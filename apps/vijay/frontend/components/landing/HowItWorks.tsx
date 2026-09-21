"use client"

import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { PinnedSteps, PinnedStep } from "@/components/motion/PinnedSteps"
import { steps } from "@/data/steps"
import { UploadMock } from "@/components/mocks/UploadMock"
import { IntentBadge } from "@/components/mocks/IntentBadge"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { EditableItem } from "@/components/mocks/EditableItem"
import { mockBriefItems } from "@/data/mockContent"

export function HowItWorks() {
  const pinnedSteps: PinnedStep[] = steps.map((step) => {
    let mockNode: React.ReactNode

    switch (step.mockId) {
      case "upload":
        mockNode = <UploadMock />
        break
      case "intent":
        mockNode = <IntentBadge />
        break
      case "brief":
        mockNode = <BriefPanel items={mockBriefItems} />
        break
      case "editable":
        mockNode = (
          <div className="space-y-3">
            <EditableItem
              type="requirement"
              text="Payment gateway setup with Stripe auto-invoicing"
              time="04:12"
            />
            <EditableItem
              type="deliverable"
              text="Next.js app routing with Clerk auth integration"
              time="08:45"
            />
          </div>
        )
        break
      default:
        mockNode = <UploadMock />
    }

    return {
      id: step.id,
      number: step.number,
      heading: step.heading,
      description: step.description,
      mockNode,
    }
  })

  return (
    <section id="how-it-works" className="relative py-16 bg-background">
      <Container>
        <div className="max-w-2xl mb-8">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-2 block">
            Workflow
          </span>
          <Heading as="h2" size="lg" className="mb-3">
            Four steps from raw audio to clean brief
          </Heading>
          <p className="text-muted-foreground text-lg">
            Scroll down to see how CallBrief handles incoming calls step-by-step.
          </p>
        </div>
      </Container>

      <PinnedSteps steps={pinnedSteps} />
    </section>
  )
}
