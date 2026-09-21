"use client"

import { SignInButton, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface AuthCtaProps {
  size?: "sm" | "md" | "lg"
  className?: string
  label?: { signedIn: string; signedOut: string }
  children?: React.ReactNode
}

export function AuthCta({
  size = "lg",
  className,
  label = { signedIn: "Open dashboard", signedOut: "Start with a call" },
  children,
}: AuthCtaProps) {
  const { isSignedIn } = useAuth()
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
    <SignInButton mode="modal">
      <Button size={size} className={className}>
        {children || label.signedOut}
      </Button>
    </SignInButton>
  )
}
