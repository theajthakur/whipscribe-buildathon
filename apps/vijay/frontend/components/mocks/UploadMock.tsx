import { UploadCloud } from "lucide-react"

export function UploadMock() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 bg-muted/40">
        <p className="font-mono text-xs text-muted-foreground tracking-wide">
          Upload · new call
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            <UploadCloud size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop a file or click to browse
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              mp3 · m4a · mp4 · mov · txt · WhatsApp export
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            readOnly
            checked
            className="rounded border-border accent-primary"
            aria-label="Consent"
          />
          <span className="text-sm text-muted-foreground">
            I have consent to process this recording
          </span>
        </label>
      </div>
    </div>
  )
}
