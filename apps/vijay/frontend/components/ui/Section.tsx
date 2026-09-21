import { cn } from "@/lib/cn"

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  bg?: "default" | "card" | "muted"
}

export function Section({
  children,
  className,
  id,
  bg = "default",
}: SectionProps) {
  const bgClasses = {
    default: "bg-background",
    card: "bg-card border-y border-border",
    muted: "bg-muted/40 border-y border-border",
  }

  return (
    <section
      id={id}
      className={cn("py-20 md:py-28 relative overflow-hidden", bgClasses[bg], className)}
    >
      {children}
    </section>
  )
}
