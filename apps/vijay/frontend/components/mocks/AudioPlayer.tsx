"use client"

import React, { useState, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Music, ShieldCheck } from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  sourceLabel?: string
  filename?: string
}

export function parseTimestampToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const clean = timeStr.trim()
  const parts = clean.split(":").map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return Number(clean) || 0
}

export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`
}

export function AudioPlayer({ audioUrl, audioRef, sourceLabel = "WhipScribe Stream", filename }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioRef, audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((err) => console.error("Audio playback error:", err))
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const targetTime = Number(e.target.value)
    audio.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  if (!audioUrl) {
    return (
      <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground font-mono flex items-center gap-2">
        <Music className="w-3.5 h-3.5 text-muted-foreground" />
        <span>No audio stream available for playback</span>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl bg-card border border-primary/20 shadow-sm space-y-2 font-mono">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
          <Music className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground truncate">{filename || "Recording Audio"}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> {sourceLabel}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Play / Pause Toggle Button */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors shadow-sm shrink-0"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Time Slider */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatSecondsToTime(currentTime)}</span>
            <span>{formatSecondsToTime(duration)}</span>
          </div>
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
