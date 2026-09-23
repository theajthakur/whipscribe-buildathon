import { Navigation } from "@/components/landing/Navigation";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Transformation } from "@/components/landing/Transformation";
import { WorkspaceShowcase } from "@/components/landing/WorkspaceShowcase";
import { HumanReview } from "@/components/landing/HumanReview";
import { Outcome } from "@/components/landing/Outcome";
import { FinalCta } from "@/components/landing/FinalCta";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      {/* Top Header Navigation */}
      <Navigation />

      {/* Main Storytelling Sections (7 Sections) */}
      <main className="w-full">
        {/* 01 — Hero */}
        <Hero />

        {/* 02 — The Problem */}
        <Problem />

        {/* 03 — The Transformation */}
        <Transformation />

        {/* 04 — The CallBrief Workspace */}
        <WorkspaceShowcase />

        {/* 05 — Human Review */}
        <HumanReview />

        {/* 06 — The Outcome */}
        <Outcome />

        {/* 07 — Final CTA & Footer */}
        <FinalCta />
      </main>
    </div>
  );
}
