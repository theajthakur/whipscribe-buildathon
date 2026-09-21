import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Sora, Figtree, IBM_Plex_Mono } from "next/font/google"
import { AuthModalProvider } from "@/components/auth/AuthModalContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import "./globals.css"

const fontSora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
})

const fontFigtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
})

const fontPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "CallBrief — AI Client Call Assistant for Freelancers",
  description:
    "Turn client call recordings, WhatsApp voice notes, and chat exports into reviewable briefs, timestamped tasks, and change request logs.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${fontSora.variable} ${fontFigtree.variable} ${fontPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ClerkProvider>
          <AuthModalProvider>
            <NuqsAdapter>
              {children}
              <AuthModal />
            </NuqsAdapter>
          </AuthModalProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}