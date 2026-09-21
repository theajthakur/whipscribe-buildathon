import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const res = await fetch(`${backendUrl}/api/submissions/${id}/audio`, {
      headers: {
        "X-User-Id": userId || "user_default_local_freelancer",
      },
      cache: "no-store",
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch audio URL" }, { status: 500 })
  }
}
