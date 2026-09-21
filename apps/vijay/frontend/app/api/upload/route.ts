import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

    const formData = await req.formData()

    const res = await fetch(`${backendUrl}/api/upload`, {
      method: "POST",
      headers: {
        "X-User-Id": userId || "user_default_local_freelancer",
      },
      body: formData,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload file" }, { status: 500 })
  }
}
