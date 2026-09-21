import { UserButton } from "@clerk/nextjs"
import { Container } from "@/components/ui/Container"
import { Heading } from "@/components/ui/Heading"
import { Badge } from "@/components/ui/Badge"
import { UploadMock } from "@/components/mocks/UploadMock"
import { BriefPanel } from "@/components/mocks/BriefPanel"
import { mockBriefItems } from "@/data/mockContent"
import Link from "next/link"
import { Plus, Clock, FileText, ArrowLeft } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Home
              </Link>
              <span className="text-border">|</span>
              <h1 className="font-display font-bold text-xl text-foreground">
                CallBrief Workspace
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <UserButton />
            </div>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main className="flex-1 py-10">
        <Container>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <Heading as="h1" size="lg" className="mb-1">
                Your Call Briefs
              </Heading>
              <p className="text-muted-foreground text-sm">
                Upload call recordings or audio notes to generate structured briefs and task lists.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Upload Box */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> New Call Brief
                </h2>
                <UploadMock />
              </div>
            </div>

            {/* Recent Briefs / Mock View */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-base text-foreground">
                      Acme E-commerce Redesign Call
                    </h2>
                  </div>
                  <Badge variant="success" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Today, 10:42 AM
                  </Badge>
                </div>
                <BriefPanel items={mockBriefItems} />
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  )
}
