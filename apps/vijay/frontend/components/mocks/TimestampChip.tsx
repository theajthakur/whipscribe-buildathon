import { Chip } from "@/components/ui/Chip"

interface TimestampChipProps {
  time: string
  active?: boolean
  onClick?: () => void
}

export function TimestampChip({ time, active, onClick }: TimestampChipProps) {
  return (
    <Chip
      active={active}
      onClick={onClick}
      aria-label={onClick ? `Jump to ${time}` : undefined}
    >
      {time}
    </Chip>
  )
}
