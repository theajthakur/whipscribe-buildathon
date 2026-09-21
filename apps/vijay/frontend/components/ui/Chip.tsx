import { cn } from "@/lib/cn"

interface ChipProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
  "aria-label"?: string
}

export function Chip({ children, className, onClick, active, "aria-label": ariaLabel }: ChipProps) {
  const isInteractive = Boolean(onClick)
  return (
    <span
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.()
            }
          : undefined
      }
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
        "transition-colors duration-150",
        active
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-muted-foreground",
        isInteractive &&
          "cursor-pointer hover:bg-accent/70 hover:text-accent-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}
