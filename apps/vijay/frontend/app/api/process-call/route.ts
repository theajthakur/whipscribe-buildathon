import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const body = await req.json()
    const { submissionId, overrideIntent } = body

    const res = await fetch(`${backendUrl}/api/submissions/${submissionId}/process-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId || "user_default_local_freelancer",
      },
      body: JSON.stringify({
        submission_id: submissionId,
        override_intent: overrideIntent,
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process agent call" }, { status: 500 })
  }
}
