"use client"

import { useState, useRef, ChangeEvent } from "react"
import { useAuth } from "@clerk/nextjs"
import { UploadCloud, Loader2, CheckCircle2, FileAudio, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

interface UploadMockProps {
  onComplete?: (callData: any) => void
}

export function UploadMock({ onComplete }: UploadMockProps) {
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setErrorMessage(null)
    }
  }

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

      // Set user ID on API client
      api.setUserId(userId || null)

      // 1. Upload File
      const res = await api.uploadAudio(selectedFile, (progress) => {
        setUploadProgress(progress)
      })

      setSubmissionId(res.submission_id)
      setStatusStep("transcribing")

      // 2. Poll WhipScribe Transcription Status
      let isDone = false
      let attempts = 0

      while (!isDone && attempts < 30) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const statusRes = await api.checkStatus(res.submission_id)

        if (statusRes.status === "completed") {
          isDone = true
          setStatusStep("processing_agent")

          // 3. Process Call with Vertex AI Agent
          const agentRes = await api.processAgent(res.submission_id)
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
            {statusStep === "processing_agent" && "Vertex AI Agent..."}
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
          className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-colors ${
            statusStep === "idle"
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
              <UploadCloud size={24} className="text-primary" />
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

        {statusStep === "processing_agent" && (
          <div className="flex items-center gap-2 text-xs font-mono text-primary p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Vertex AI Agent: Running RouterAgent & Playbook synthesis...</span>
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
