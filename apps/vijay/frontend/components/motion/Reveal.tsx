"use client"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap"
import { cn } from "@/lib/cn"

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  from?: "bottom" | "left" | "right"
}

export function Reveal({ children, className, delay = 0, from = "bottom" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          opacity: 0,
          y: from === "bottom" ? 24 : 0,
          x: from === "left" ? -24 : from === "right" ? 24 : 0,
          duration: 0.55,
          delay,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 88%",
          },
        })
      })
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  )
}
