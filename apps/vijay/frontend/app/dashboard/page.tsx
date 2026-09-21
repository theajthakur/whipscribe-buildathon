"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { UserButton, useAuth } from "@clerk/nextjs"
import { Badge } from "@/components/ui/Badge"
import { UploadMock } from "@/components/mocks/UploadMock"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { AudioPlayer, parseTimestampToSeconds } from "@/components/mocks/AudioPlayer"
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
  Sparkles,
  Copy,
  Check,
  ChevronDown,
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
  const [isAudioClosed, setIsAudioClosed] = useState(false)
  const [selectedFilename, setSelectedFilename] = useState<string>("")
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [processingSubId, setProcessingSubId] = useState<string | null>(null)
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)

  const toggleUploader = () => {
    setIsUploaderOpen((prev) => {
      const next = !prev
      if (next) setIsHistoryOpen(false)
      else setIsHistoryOpen(true)
      return next
    })
  }

  const toggleHistory = () => {
    setIsHistoryOpen((prev) => {
      const next = !prev
      if (next) setIsUploaderOpen(false)
      else setIsUploaderOpen(true)
      return next
    })
  }



  useEffect(() => {
    if (audioData?.audioUrl) {
      setIsAudioClosed(false)
    }
  }, [audioData])

  const hasActiveAudio = Boolean(audioData?.audioUrl) && !isAudioClosed


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

  const copyDraftToClipboard = () => {
    if (activeCallData?.proposal?.client_message_draft) {
      navigator.clipboard.writeText(activeCallData.proposal.client_message_draft)
      setCopiedDraft(true)
      setTimeout(() => setCopiedDraft(false), 2000)
    }
  }

  return (
    <div className="min-h-screen lg:h-screen w-full bg-background text-foreground flex flex-col overflow-x-hidden lg:overflow-hidden font-sans">
      {/* Sleek Glassmorphism Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="font-display font-bold text-sm text-foreground tracking-tight">
              CallBrief Workspace
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSubmissions}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Refresh history"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <UserButton />
        </div>
      </header>

      {/* Main Workspace - Adaptive Viewport Container */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column / Sidebar: New Upload & Recording History */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-r border-border bg-card/30 flex flex-col h-auto lg:h-full overflow-hidden">
          
          {/* Scrollable Container for Upload & Submissions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">


            
            {/* 1. New Recording Collapsible Box */}
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider">
                      New Call Recording
                    </h2>
                    {!isUploaderOpen && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Click extend to upload file
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={toggleUploader}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                  title={isUploaderOpen ? "Collapse upload zone" : "Extend upload zone"}
                >
                  <span>{isUploaderOpen ? "Collapse" : "Extend"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUploaderOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isUploaderOpen && (
                <div className="mt-3.5 pt-3 border-t border-border">
                  <UploadMock
                    onComplete={handleUploadComplete}
                    onUploadSuccess={() => {
                      fetchSubmissions()
                      setIsUploaderOpen(false)
                      setIsHistoryOpen(true)
                    }}
                  />
                </div>
              )}
            </div>

            {/* 2. Submissions DB History List */}
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm flex flex-col transition-all duration-200">
              <div
                onClick={toggleHistory}
                className="flex items-center justify-between pb-2 border-b border-border cursor-pointer select-none"
              >
                <h2 className="font-display font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <History className="w-3.5 h-3.5 text-primary" /> Recording History
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {submissions.length} files
                  </span>
                  <button
                    className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                    title={isHistoryOpen ? "Collapse history" : "Extend history"}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isHistoryOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {isHistoryOpen && (
                <div className="pt-3">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" /> Loading history...
                    </div>
                  ) : submissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No recordings processed yet. Upload a file above to get started.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {submissions.map((sub) => {
                        const isSelected = selectedSubId === sub.id
                        const isProcessing = processingSubId === sub.id

                        return (
                          <div
                            key={sub.id}
                            onClick={() => handleSelectSubmission(sub)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="font-semibold text-foreground truncate flex items-center gap-1.5 min-w-0">
                                <FileAudio className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate">{sub.filename}</span>
                              </span>
                              <span className="font-mono text-[10px] shrink-0">
                                {sub.status === "completed" && (
                                  <span className="text-emerald-500 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                )}
                                {sub.status === "transcribing" && (
                                  <span className="text-amber-500 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Transcribing
                                  </span>
                                )}
                                {sub.status === "pending" && (
                                  <span className="text-amber-400 font-medium flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                                {sub.status === "failed" && (
                                  <span className="text-destructive font-medium flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                                    <AlertCircle className="w-3 h-3" /> Failed
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-1.5">
                              <span className="truncate max-w-[180px]" title={sub.transcript_job_id}>
                                Job: {sub.transcript_job_id ? sub.transcript_job_id.slice(0, 16) + "..." : "N/A"}
                              </span>
                              <span>
                                {sub.created_at ? new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                              </span>
                            </div>

                            {isProcessing && (
                              <div className="mt-2 text-[11px] text-primary flex items-center gap-1 font-mono">
                                <Loader2 className="w-3 h-3 animate-spin" /> Loading brief proposal...
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Panel: Main Call Brief Proposal Workspace */}
        <div className="flex-1 flex flex-col h-auto lg:h-full overflow-hidden bg-background">
          {activeCallData ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Proposal Header Bar */}
              <div className="h-12 border-b border-border bg-card/40 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="font-display font-semibold text-sm text-foreground truncate">
                    Proposal: {selectedFilename || "Call Recording"}
                  </h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="success" className="text-[11px] font-mono">
                    <Clock className="w-3 h-3 mr-1" /> Active
                  </Badge>
                </div>
              </div>

              {/* Scrollable Brief Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {activeCallData?.router_result && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Detected Intent: </span>
                        <span className="font-mono text-primary font-bold uppercase tracking-wide">
                          {activeCallData.router_result.intent}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px] bg-background/50 px-2.5 py-1 rounded-md border border-border">
                      Confidence: {(activeCallData.router_result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Brief Items Panel with Interactive Timestamp Chips */}
                <BriefPanel
                  items={itemsToDisplay}
                  activeItemId={activeItemId}
                  onChipClick={handleChipClick}
                />

                {/* Drafted Client Message Card */}
                {activeCallData?.proposal?.client_message_draft && (
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-foreground">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        DRAFTED CLIENT CONFIRMATION MESSAGE
                      </div>
                      <button
                        onClick={copyDraftToClipboard}
                        className="px-2.5 py-1 rounded-md text-xs font-mono border border-border hover:bg-muted transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {copiedDraft ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Draft</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/80 text-xs text-foreground/90 font-sans leading-relaxed whitespace-pre-line">
                      {activeCallData.proposal.client_message_draft}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Modern Full Viewport Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/10 min-h-[350px]">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-xl text-foreground mb-2">
                No Call Proposal Selected
              </h3>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6">
                Upload a call recording or audio note on the left sidebar, or select a past submission from history to view its AI proposal breakdown, task list, and client draft.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modern Responsive Audio Player Flex Bar */}
      {hasActiveAudio && (
        <AudioPlayer
          audioUrl={audioData?.audioUrl || null}
          audioRef={audioRef}
          sourceLabel="WhipScribe API Stream"
          filename={selectedFilename || "Recording Audio"}
          onTimeUpdate={handleAudioTimeUpdate}
          onClose={() => setIsAudioClosed(true)}
        />
      )}

    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading CallBrief Workspace...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
