import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap, ScrollTrigger } from "@/lib/gsap"

/**
 * Drives the pinned-steps "How it works" scroll scene.
 * Returns a ref (attach to the outer tall container) and the active step index.
 */
export function useScrollScene(numSteps: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useGSAP(
    () => {
      if (!containerRef.current) return

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          const step = Math.min(
            numSteps - 1,
            Math.floor(self.progress * numSteps),
          )
          setActiveStep(step)
        },
      })

      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill())
      }
    },
    { scope: containerRef, dependencies: [numSteps] },
  )

  return { containerRef, activeStep }
}
