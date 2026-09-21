"use client"

import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Badge } from "@/components/ui/Badge"
import { Section } from "@/components/ui/Section"
import { Reveal } from "@/components/motion/Reveal"
import { callTypes } from "@/data/callTypes"
import { Layers, ArrowRight } from "lucide-react"

export function CallTypes() {
  return (
    <Section bg="card" id="call-types">
      <Container>
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-2 block">
            Adaptive Processing
          </span>
          <Heading as="h2" size="lg" className="mb-4">
            Output that fits the exact conversation
          </Heading>
          <p className="text-muted-foreground text-lg">
            A quick inquiry gets a 3-line summary and a price estimate draft — not a 10-page scope document. CallBrief detects intent and structures output accordingly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {callTypes.map((ct, idx) => (
            <Reveal key={ct.id} delay={idx * 0.1}>
              <div className="h-full p-6 rounded-xl border border-border bg-background flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={ct.color}>{ct.label}</Badge>
                    <Layers className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    {ct.description}
                  </h3>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <div className="text-xs font-mono font-medium text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                    <span>Generated Output</span>
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground/90">
                    {ct.output}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
