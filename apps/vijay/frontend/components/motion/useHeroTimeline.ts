import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "@/lib/gsap"

/**
 * Animates a panel container in on mount.
 * Returns a ref to attach to the container element.
 * Must be called inside a "use client" component.
 */
export function useHeroTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!containerRef.current) return

      const mm = gsap.matchMedia()

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ delay: 0.2 })

        // Headline + CTA side
        tl.from("[data-hero-copy]", {
          opacity: 0,
          y: 20,
          duration: 0.55,
          ease: "power2.out",
        })

        // Transcript panel
        tl.from(
          "[data-hero-transcript]",
          { opacity: 0, x: 20, duration: 0.5, ease: "power2.out" },
          "-=0.3",
        )

        // Brief panel
        tl.from(
          "[data-hero-brief]",
          { opacity: 0, x: 20, duration: 0.5, ease: "power2.out" },
          "-=0.3",
        )
      })
    },
    { scope: containerRef },
  )

  return containerRef
}
