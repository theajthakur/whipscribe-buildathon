"use client"

import React, { useState, useEffect } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  sourceLabel?: string
  filename?: string
  onClose?: () => void
  onTimeUpdate?: (currentTime: number) => void
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

export function AudioPlayer({
  audioUrl,
  audioRef,
  sourceLabel = "WhipScribe Stream",
  filename = "Call Recording",
  onClose,
  onTimeUpdate,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (audioUrl) {
      setIsVisible(true)
    }
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const cur = audio.currentTime
      setCurrentTime(cur)
      if (onTimeUpdate) {
        onTimeUpdate(cur)
      }
    }
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
  }, [audioRef, audioUrl, onTimeUpdate])

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

  const skipTime = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setVolume(val)
    const audio = audioRef.current
    if (audio) {
      audio.volume = val
      if (val === 0) {
        audio.muted = true
        setIsMuted(true)
      } else {
        audio.muted = false
        setIsMuted(false)
      }
    }
  }

  if (!audioUrl || !isVisible) {
    return <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />
  }

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Modern Audio Player Flex Bar */}
      <div className="w-full shrink-0 z-30 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 font-sans">

        
        {/* MOBILE LAYOUT (md:hidden) */}
        <div className="flex md:hidden flex-col px-4 py-2.5">
          {/* Top Row: Icon + Info <---> Play/Pause + Mute + Close */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Icon | Title & Subtitle */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Music className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{filename}</p>
                <p className="text-[11px] text-primary truncate font-medium">{sourceLabel}</p>
              </div>
            </div>

            {/* Right: Play/Pause | Mute | Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-md transition-transform active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setIsVisible(false)
                  if (onClose) onClose()
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Close audio player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottommost Row: Audio Progress Timeline Bar */}
          <div className="flex items-center gap-2.5 w-full font-mono text-[10px] text-muted-foreground mt-2">
            <span className="w-8 text-right shrink-0">{formatSecondsToTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="w-8 shrink-0">{formatSecondsToTime(duration)}</span>
          </div>
        </div>

        {/* DESKTOP LAYOUT (hidden md:flex) */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 py-3 flex-row items-center justify-between gap-6">
          {/* Left: Audio Info */}
          <div className="flex items-center gap-3 w-1/4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{filename}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-primary font-medium">
                  {sourceLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Playback Controls & Timeline Slider */}
          <div className="flex flex-col items-center gap-1.5 w-2/4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => skipTime(-10)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all shadow-md shadow-primary/25 hover:scale-105 active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={() => skipTime(10)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 w-full font-mono text-[11px] text-muted-foreground">
              <span className="w-10 text-right shrink-0">{formatSecondsToTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="w-10 shrink-0">{formatSecondsToTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Minimize Controls */}
          <div className="flex items-center justify-end gap-3 w-1/4 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary hidden sm:block"
              />
            </div>

            <button
              onClick={() => {
                setIsVisible(false)
                if (onClose) onClose()
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hide audio player bar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
