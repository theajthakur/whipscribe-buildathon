import { auth } from "@clerk/nextjs/server"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const body = await req.json()
    const { submissionId, overrideIntent } = body

    const res = await fetch(`${backendUrl}/api/submissions/${submissionId}/process-agent-stream`, {
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

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to stream agent workflow" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
