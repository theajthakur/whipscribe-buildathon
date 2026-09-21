"use client"

import { useState } from "react"
import { UserButton, useAuth } from "@clerk/nextjs"
import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Badge } from "@/components/ui/Badge"
import { UploadMock } from "@/components/mocks/UploadMock"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { mockBriefItems } from "@/data/mockContent"
import Link from "next/link"
import { Plus, Clock, FileText, ArrowLeft, Sparkles, MessageSquare } from "lucide-react"

export default function DashboardPage() {
  const { userId } = useAuth()
  const [activeCallData, setActiveCallData] = useState<any>(null)

  const handleUploadComplete = (agentResponse: any) => {
    if (agentResponse && agentResponse.proposal) {
      setActiveCallData(agentResponse)
    }
  }

  const itemsToDisplay = activeCallData?.proposal
    ? [
        ...activeCallData.proposal.requirements.map((r: any) => ({
          id: r.id,
          type: "requirement" as const,
          text: r.text,
          time: r.time,
          transcriptRef: "t1",
        })),
        ...activeCallData.proposal.tasks.map((t: any) => ({
          id: t.id,
          type: "task" as const,
          text: `${t.title} [Effort: ${t.effort}]`,
          time: t.time,
          transcriptRef: "t2",
        })),
      ]
    : mockBriefItems

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Home
              </Link>
              <span className="text-border">|</span>
              <h1 className="font-display font-bold text-xl text-foreground">
                CallBrief Workspace
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <UserButton />
            </div>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main className="flex-1 py-10">
        <Container>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <Heading as="h1" size="lg" className="mb-1">
                Your Call Briefs
              </Heading>
              <p className="text-muted-foreground text-sm">
                Upload call recordings or audio notes to generate structured briefs and task lists with WhipScribe & Vertex AI.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Upload Box */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> New Call Recording
                </h2>
                <UploadMock onComplete={handleUploadComplete} />
              </div>
            </div>

            {/* Active Brief View */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-base text-foreground">
                      {activeCallData ? "Processed Call Proposal" : "Acme E-commerce Redesign Call"}
                    </h2>
                  </div>
                  <Badge variant="success" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Today
                  </Badge>
                </div>

                {activeCallData?.router_result && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">Detected Intent: </span>
                      <span className="font-mono text-primary font-semibold uppercase">{activeCallData.router_result.intent}</span>
                    </div>
                    <span className="text-muted-foreground">
                      Confidence: {(activeCallData.router_result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                <BriefPanel items={itemsToDisplay} />

                {activeCallData?.proposal?.client_message_draft && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-foreground mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      DRAFTED CLIENT CONFIRMATION MESSAGE
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-foreground/90 font-sans whitespace-pre-line">
                      {activeCallData.proposal.client_message_draft}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  )
}
