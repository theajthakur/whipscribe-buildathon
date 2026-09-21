import { Container } from "@/components/ui/Container"

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <Container>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-display font-bold text-lg text-foreground">
            CallBrief
          </p>
          <p className="text-sm text-muted-foreground">
            For freelancers who take calls.
          </p>
        </div>
      </Container>
    </footer>
  )
}
