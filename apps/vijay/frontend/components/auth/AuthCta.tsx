"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useAuthModal } from "./AuthModalContext"
import { Button } from "@/components/ui/Button"

interface AuthCtaProps {
  size?: "sm" | "md" | "lg"
  className?: string
  label?: { signedIn: string; signedOut: string }
  mode?: "sign-in" | "sign-up"
  children?: React.ReactNode
}

export function AuthCta({
  size = "lg",
  className,
  label = { signedIn: "Open dashboard", signedOut: "Start with a call" },
  mode = "sign-up",
  children,
}: AuthCtaProps) {
  const { isSignedIn } = useAuth()
  const { openAuthModal } = useAuthModal()
  const router = useRouter()

  if (isSignedIn) {
    return (
      <Button
        size={size}
        className={className}
        onClick={() => router.push("/dashboard")}
      >
        {children || label.signedIn}
      </Button>
    )
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={() => openAuthModal(mode)}
    >
      {children || label.signedOut}
    </Button>
  )
}
