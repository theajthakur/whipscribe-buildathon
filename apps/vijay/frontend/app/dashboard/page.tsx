"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"

import { UserButton, useAuth } from "@clerk/nextjs"
import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Badge } from "@/components/ui/Badge"
import { UploadMock } from "@/components/mocks/UploadMock"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { AudioPlayer, parseTimestampToSeconds } from "@/components/mocks/AudioPlayer"
import { mockBriefItems } from "@/data/mockContent"
import { api } from "@/lib/api"
import { useQueryState, parseAsString } from "nuqs"
import Link from "next/link"
import {
  Plus,
  Clock,
  FileText,
  ArrowLeft,
  MessageSquare,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileAudio,
} from "lucide-react"

export interface SubmissionItem {
  id: string
  source_type: string
  source_location: string
  filename: string
  status: "pending" | "transcribing" | "completed" | "failed"
  transcript_job_id: string
  created_at: string
  has_transcript: boolean
  calls: string[]
}

function DashboardContent() {
  const { userId } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)

  // URL Query State preserving submission ID, active item, and timestamp using nuqs
  const [selectedSubId, setSelectedSubId] = useQueryState("sub", parseAsString.withDefault(""))
  const [activeItemId, setActiveItemId] = useQueryState("item", parseAsString.withDefault(""))
  const [activeTime, setActiveTime] = useQueryState("time", parseAsString.withDefault(""))

  const [activeCallData, setActiveCallData] = useState<any>(null)
  const [audioData, setAudioData] = useState<{ audioUrl: string | null; source: string } | null>(null)
  const [selectedFilename, setSelectedFilename] = useState<string>("")
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [processingSubId, setProcessingSubId] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      api.setUserId(userId || null)
      const data = await api.getUserSubmissions()
      setSubmissions(data)
    } catch (err) {
      console.error("Failed to load submissions", err)
    } finally {
      setLoadingHistory(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const loadAudioForSubmission = useCallback(async (subId: string) => {
    try {
      api.setUserId(userId || null)
      const audioRes = await api.getSubmissionAudio(subId)
      setAudioData({
        audioUrl: audioRes.audio_url || audioRes.local_fallback,
        source: audioRes.source,
      })
    } catch (err) {
      console.error("Failed to load submission audio URL", err)
    }
  }, [userId])

  const loadSubmissionDetails = useCallback(async (sub: SubmissionItem) => {
    setSelectedFilename(sub.filename)
    loadAudioForSubmission(sub.id)

    if (sub.status === "completed") {
      try {
        setProcessingSubId(sub.id)
        api.setUserId(userId || null)
        const agentRes = await api.processAgent(sub.id)
        if (agentRes && agentRes.proposal) {
          setActiveCallData(agentRes)
        }
      } catch (err) {
        console.error("Failed to load call proposal", err)
      } finally {
        setProcessingSubId(null)
      }
    }
  }, [userId, loadAudioForSubmission])

  // Auto-restore state from URL query parameter `?sub=...` on initial load
  useEffect(() => {
    if (selectedSubId && submissions.length > 0 && !activeCallData) {
      const targetSub = submissions.find((s) => s.id === selectedSubId)
      if (targetSub) {
        loadSubmissionDetails(targetSub)
      }
    }
  }, [selectedSubId, submissions, activeCallData, loadSubmissionDetails])

  const handleUploadComplete = async (agentResponse: any) => {
    if (agentResponse && agentResponse.proposal) {
      setActiveCallData(agentResponse)
    }
    fetchSubmissions()
  }

  const handleSelectSubmission = async (sub: SubmissionItem) => {
    setSelectedSubId(sub.id)
    loadSubmissionDetails(sub)
  }

  const handleChipClick = (timeStr: string, itemId: string) => {
    setActiveItemId(itemId)
    setActiveTime(timeStr)
    if (audioRef.current && timeStr) {
      const targetSeconds = parseTimestampToSeconds(timeStr)
      audioRef.current.currentTime = targetSeconds
      audioRef.current.play().catch((err) => console.error("Audio playback note:", err))
    }
  }

  const itemsToDisplay = activeCallData?.proposal
    ? [
        ...(activeCallData.proposal.requirements || []).map((r: any) => ({
          id: r.id || Math.random().toString(),
          type: "requirement" as const,
          text: r.text,
          time: r.time,
          transcriptRef: "t1",
        })),
        ...(activeCallData.proposal.tasks || []).map((t: any) => ({
          id: t.id || Math.random().toString(),
          type: "task" as const,
          text: `${t.title} [Effort: ${t.effort || "M"}]`,
          time: t.time,
          transcriptRef: "t2",
        })),
      ]
    : []

  const handleAudioTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!itemsToDisplay || itemsToDisplay.length === 0) return

      // Sort items by their timestamp in seconds
      const itemsWithSeconds = itemsToDisplay
        .map((item: any) => ({
          id: item.id,
          seconds: parseTimestampToSeconds(item.time),
        }))
        .filter((it: any) => !isNaN(it.seconds))
        .sort((a: any, b: any) => a.seconds - b.seconds)

      if (itemsWithSeconds.length === 0) return

      let matchedId: string | null = null

      for (let i = 0; i < itemsWithSeconds.length; i++) {
        const curItem = itemsWithSeconds[i]
        const nextItem = itemsWithSeconds[i + 1]

        const start = curItem.seconds
        const end = nextItem ? nextItem.seconds : Infinity

        if (currentTime >= start && currentTime < end) {
          matchedId = curItem.id
          break
        }
      }

      if (matchedId && matchedId !== activeItemId) {
        setActiveItemId(matchedId)
        const el = document.querySelector(`[data-brief-item="${matchedId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }
    },
    [itemsToDisplay, activeItemId]
  )

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
      <main className="flex-1 py-10 pb-24">
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
            {/* Left Column: Upload Box + Submissions History */}
            <div className="lg:col-span-5 space-y-6">
              {/* Upload Box */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> New Call Recording
                </h2>
                <UploadMock
                  onComplete={handleUploadComplete}
                  onUploadSuccess={fetchSubmissions}
                />
              </div>

              {/* Submissions DB History List */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <h2 className="font-display font-semibold text-base text-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Uploaded Files & WhipScribe Status
                  </h2>
                  <button
                    onClick={fetchSubmissions}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Refresh history"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading past recordings...
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No files uploaded yet. Upload a recording above to get started.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {submissions.map((sub) => {
                      const isSelected = selectedSubId === sub.id
                      const isProcessing = processingSubId === sub.id

                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubmission(sub)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary/50 bg-primary/10"
                              : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-foreground truncate max-w-[200px] flex items-center gap-1.5">
                              <FileAudio className="w-3.5 h-3.5 text-primary shrink-0" />
                              {sub.filename}
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border">
                              {sub.status === "completed" && (
                                <span className="text-emerald-500 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                              {sub.status === "transcribing" && (
                                <span className="text-amber-500 font-medium flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Transcribing
                                </span>
                              )}
                              {sub.status === "pending" && (
                                <span className="text-amber-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                              {sub.status === "failed" && (
                                <span className="text-destructive font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-1">
                            <span className="truncate max-w-[170px]" title={sub.transcript_job_id}>
                              Job: {sub.transcript_job_id ? sub.transcript_job_id.slice(0, 16) + "..." : "N/A"}
                            </span>
                            <span>
                              {sub.created_at ? new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                            </span>
                          </div>

                          {isProcessing && (
                            <div className="mt-2 text-[11px] text-primary flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Loading brief from database...
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Active Brief View or Empty State */}
            <div className="lg:col-span-7 space-y-6">
              {activeCallData ? (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm max-h-[620px] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h2 className="font-display font-semibold text-base text-foreground">
                        Processed Call Proposal
                      </h2>
                    </div>
                    <Badge variant="success" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  </div>

                  <div className="overflow-y-auto space-y-4 pr-1.5 flex-1">
                    {activeCallData?.router_result && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground">Detected Intent: </span>
                          <span className="font-mono text-primary font-semibold uppercase">
                            {activeCallData.router_result.intent}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          Confidence: {(activeCallData.router_result.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    <BriefPanel
                      items={itemsToDisplay}
                      activeItemId={activeItemId}
                      onChipClick={handleChipClick}
                    />

                    {activeCallData?.proposal?.client_message_draft && (
                      <div className="mt-4 pt-4 border-t border-border">
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
              ) : (
                /* Empty State when no active call is selected */
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 text-muted-foreground">
                    <FileText className="w-7 h-7 text-primary/70" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    No Call Proposal Selected
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Upload an audio recording on the left or select a past submission from history to view its AI proposal, task breakdown, and drafted client message.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      {/* Modern Responsive Fixed Bottom Audio Player Bar */}
      <AudioPlayer
        audioUrl={audioData?.audioUrl || null}
        audioRef={audioRef}
        sourceLabel={audioData?.source === "whipscribe" ? "WhipScribe API Stream" : "Local Audio"}
        filename={selectedFilename || "Recording Audio"}
        onTimeUpdate={handleAudioTimeUpdate}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading CallBrief Dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

