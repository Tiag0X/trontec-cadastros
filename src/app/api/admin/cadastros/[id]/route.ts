import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const submission = await prisma.registrationSubmission.findUnique({
      where: { id: params.id },
      include: {
        unit: { include: { condominium: true } },
        residents: true,
        vehicles: true,
        photos: true,
        termAccepts: { include: { term: true } },
        token: true
      }
    })

    if (!submission) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error("[CADASTRO_DETAIL_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { status, reviewNotes, internalObservation } = body

    const submission = await prisma.registrationSubmission.update({
      where: { id: params.id },
      data: {
        status,
        reviewNotes,
        internalObservation,
        reviewedById: session.user.id,
        reviewedAt: new Date()
      },
      include: { unit: true }
    })

    // Se aprovado, atualiza o status da unidade também
    if (status === 'approved') {
      await prisma.unit.update({
        where: { id: submission.unitId },
        data: { 
          registrationStatus: 'approved',
          garageBoxes: submission.garageBoxes
        }
      })
    } else if (status === 'rejected') {
      await prisma.unit.update({
        where: { id: submission.unitId },
        data: { registrationStatus: 'rejected' }
      })
      if (submission.tokenId) {
        await prisma.unitToken.update({
          where: { id: submission.tokenId },
          data: { status: 'active' }
        })
      }
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error("[CADASTRO_DETAIL_PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
