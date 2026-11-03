import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'submitted'

    const submissions = await prisma.registrationSubmission.findMany({
      where: {
        status: status as any
      },
      include: {
        unit: {
          include: { condominium: true }
        },
        _count: {
          select: { residents: true, vehicles: true, photos: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error("[CADASTROS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
