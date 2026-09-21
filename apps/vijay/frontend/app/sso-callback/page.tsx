import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuthenticateWithRedirectCallback
        signUpForceRedirectUrl="/dashboard"
        signInForceRedirectUrl="/dashboard"
      />
    </div>
  )
}
