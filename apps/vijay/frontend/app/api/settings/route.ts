import { auth } from "@clerk/nextjs/server"
import { NextResponse, NextRequest } from "next/server"

export async function GET() {
  try {
    const { userId } = await auth()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const res = await fetch(`${backendUrl}/api/settings`, {
      headers: {
        "X-User-Id": userId || "user_default_local_freelancer",
      },
      cache: "no-store",
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    const body = await request.json()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const res = await fetch(`${backendUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId || "user_default_local_freelancer",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 })
  }
}
