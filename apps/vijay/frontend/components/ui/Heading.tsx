import { cn } from "@/lib/cn"

type HeadingLevel = "h1" | "h2" | "h3" | "h4"
type HeadingSize = "xl" | "lg" | "md" | "sm"

interface HeadingProps {
  as?: HeadingLevel
  size?: HeadingSize
  children: React.ReactNode
  className?: string
}

const sizes: Record<HeadingSize, string> = {
  xl: "text-5xl sm:text-6xl md:text-7xl",
  lg: "text-3xl sm:text-4xl md:text-5xl",
  md: "text-2xl sm:text-3xl",
  sm: "text-xl sm:text-2xl",
}

export function Heading({
  as: Tag = "h2",
  size = "lg",
  children,
  className,
}: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-bold tracking-tight text-foreground",
        sizes[size],
        className,
      )}
    >
      {children}
    </Tag>
  )
}
