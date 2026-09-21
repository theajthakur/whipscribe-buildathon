"use client"

import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { AuthCta } from "@/components/auth/AuthCta"
import { Section } from "@/components/ui/Section"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export function FinalCta() {
  return (
    <Section bg="card" className="border-t border-border">
      <Container>
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center py-8">
          <Heading as="h2" size="xl" className="mb-6 max-w-2xl text-foreground">
            Stop losing billable hours to post-call ambiguity.
          </Heading>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
            Turn your next call recording or voice note into an actionable, editable client brief in under 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <AuthCta size="lg" className="px-8 py-4 text-base shadow-lg shadow-primary/25">
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </AuthCta>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-muted-foreground pt-4 border-t border-border/60 w-full max-w-lg">
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Full review control</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Instant setup</span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
