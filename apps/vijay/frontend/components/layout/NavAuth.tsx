"use client"

import { UserButton, useAuth } from "@clerk/nextjs"
import { useAuthModal } from "@/components/auth/AuthModalContext"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export function NavAuth() {
  const { isSignedIn } = useAuth()
  const { openAuthModal } = useAuthModal()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          Dashboard
        </Link>
        <UserButton />
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openAuthModal("sign-in")}
    >
      Sign in
    </Button>
  )
}
