"use client"
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/Button"

export function NavAuth() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <UserButton />
  }

  return (
    <SignInButton mode="modal">
      <Button variant="ghost" size="sm">
        Sign in
      </Button>
    </SignInButton>
  )
}
