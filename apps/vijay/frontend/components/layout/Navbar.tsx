import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { NavAuth } from "./NavAuth"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <Container>
        <nav
          className="flex h-16 items-center justify-between"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="font-display text-xl font-bold text-foreground hover:text-primary transition-colors"
          >
            CallBrief
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="#how-it-works"
              className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <NavAuth />
          </div>
        </nav>
      </Container>
    </header>
  )
}
