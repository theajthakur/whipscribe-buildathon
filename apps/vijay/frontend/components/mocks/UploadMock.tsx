"use client"

import { useState, useRef, ChangeEvent } from "react"
import { useAuth } from "@clerk/nextjs"
import { UploadCloud, Loader2, CheckCircle2, FileAudio, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

interface UploadMockProps {
  onComplete?: (callData: any) => void
  onUploadSuccess?: () => void
}

export function UploadMock({ onComplete, onUploadSuccess }: UploadMockProps) {
  const { userId } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [consent, setConsent] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusStep, setStatusStep] = useState<
    "idle" | "uploading" | "transcribing" | "processing_agent" | "completed" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setErrorMessage(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (statusStep === "idle") {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (statusStep !== "idle") return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0])
      setErrorMessage(null)
    }
  }

  const [agentLogs, setAgentLogs] = useState<string[]>([])
  const [agentProgress, setAgentProgress] = useState(0)

  const handleStartUpload = async () => {
    if (!selectedFile) return
    if (!consent) {
      setErrorMessage("Please confirm you have consent to process this recording.")
      return
    }

    try {
      setErrorMessage(null)
      setStatusStep("uploading")
      setUploadProgress(0)
      setAgentLogs([])
      setAgentProgress(0)

      // Set user ID on API client
      api.setUserId(userId || null)

      // Exponential progress animation towards 80% threshold
      let currentSimulated = 0
      const simTimer = setInterval(() => {
        // Exponential decrease in speed approaching 80%
        currentSimulated = currentSimulated + (80 - currentSimulated) * 0.08
        setUploadProgress(Math.min(80, Math.round(currentSimulated)))
      }, 100)

      // 1. Upload File
      const res = await api.uploadAudio(selectedFile)

      // Clear interval timer once backend upload returns
      clearInterval(simTimer)

      // Smoothly animate progress 80% -> 100%
      const startP = Math.max(currentSimulated, 50)
      const animDuration = 350
      const intervalMs = 25
      const steps = animDuration / intervalMs
      let stepCount = 0

      await new Promise<void>((resolve) => {
        const finishTimer = setInterval(() => {
          stepCount++
          const progressVal = Math.min(100, Math.round(startP + ((100 - startP) * stepCount) / steps))
          setUploadProgress(progressVal)
          if (stepCount >= steps || progressVal >= 100) {
            clearInterval(finishTimer)
            resolve()
          }
        }, intervalMs)
      })

      setSubmissionId(res.submission_id)
      if (onUploadSuccess) {
        onUploadSuccess()
      }

      setStatusStep("transcribing")

      // 2. Poll WhipScribe Transcription Status
      let isDone = false
      let attempts = 0

      while (!isDone && attempts < 60) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const statusRes = await api.checkStatus(res.submission_id)

        if (statusRes.status === "completed") {
          isDone = true
          setStatusStep("processing_agent")

          // 3. Process Call with Real HTTP Streaming Vertex AI Agent
          setAgentLogs([])
          setAgentProgress(10)
          const agentRes = await api.processAgentStream(
            res.submission_id,
            (log) => {
              setAgentLogs((prev) => [...prev, log.message])
              setAgentProgress(log.percent)
            }
          )
          setStatusStep("completed")

          if (onComplete) {
            onComplete(agentRes)
          }
          break
        } else if (statusRes.status === "failed") {
          setStatusStep("error")
          setErrorMessage("WhipScribe transcription failed.")
          break
        }
      }
    } catch (err: any) {
      setStatusStep("error")
      setErrorMessage(err?.response?.data?.detail || err?.message || "Failed to process recording.")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40 flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Upload · New Call Recording
        </p>

        {statusStep !== "idle" && (
          <span className="text-[11px] font-mono font-medium text-primary uppercase">
            {statusStep === "uploading" && "Uploading..."}
            {statusStep === "transcribing" && "WhipScribe Transcribing..."}
            {statusStep === "processing_agent" && "Vertex AI Agent Streaming..."}
            {statusStep === "completed" && "Done"}
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* File Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*,video/*,.mp3,.m4a,.wav,.txt"
          className="hidden"
        />

        <div
          onClick={() => statusStep === "idle" && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01] shadow-md ring-2 ring-primary/20 cursor-copy"
              : statusStep === "idle"
              ? "border-border bg-muted/20 hover:border-primary/50 cursor-pointer"
              : "border-primary/30 bg-primary/5 cursor-default"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            {statusStep === "uploading" || statusStep === "transcribing" || statusStep === "processing_agent" ? (
              <Loader2 size={24} className="text-primary animate-spin" />
            ) : statusStep === "completed" ? (
              <CheckCircle2 size={24} className="text-success" />
            ) : (
              <UploadCloud size={24} className={`text-primary ${isDragging ? "scale-110 text-primary animate-bounce" : ""}`} />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedFile ? selectedFile.name : "Drop audio file or click to browse"}
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              mp3 · m4a · wav · mp4 · WhatsApp voice notes
            </p>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {statusStep === "uploading" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Uploading to server</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Process Status Messages */}
        {statusStep === "transcribing" && (
          <div className="flex items-center gap-2 text-xs font-mono text-primary p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>WhipScribe API: Transcribing audio with speaker diarization & timestamps...</span>
          </div>
        )}

        {/* Real-time Streaming Agent Console */}
        {statusStep === "processing_agent" && (
          <div className="space-y-2 rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-400">Vertex AI Agent Live Stream</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{agentProgress}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${agentProgress}%` }}
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed pt-1">
              {agentLogs.length === 0 ? (
                <div className="text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Connecting to Vertex AI Agent stream...</span>
                </div>
              ) : (
                agentLogs.map((msg, i) => (
                  <div key={i} className="text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold select-none">&gt;</span>
                    <span>{msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-destructive p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Consent Checkbox & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              I have consent to process this call recording
            </span>
          </label>

          {selectedFile && statusStep === "idle" && (
            <button
              onClick={handleStartUpload}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Start Processing
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
