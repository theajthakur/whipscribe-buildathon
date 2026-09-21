import { Navbar } from "@/components/layout/Navbar"
import { Hero } from "@/components/landing/Hero"
import { CallTypes } from "@/components/landing/CallTypes"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { FeatureShowcase } from "@/components/landing/FeatureShowcase"
import { FinalCta } from "@/components/landing/FinalCta"
import { Footer } from "@/components/layout/Footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <CallTypes />
        <HowItWorks />
        <FeatureShowcase />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
