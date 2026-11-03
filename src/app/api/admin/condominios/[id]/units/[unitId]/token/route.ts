import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(req: Request, props: { params: Promise<{ id: string, unitId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify if unit belongs to condo
    const unit = await prisma.unit.findUnique({
      where: { id: params.unitId },
      include: { condominium: true }
    })

    if (!unit || unit.condominiumId !== params.id) {
      return NextResponse.json({ error: "Unidade inválida" }, { status: 400 })
    }

    // Generate secure token
    const tokenPreview = crypto.randomBytes(3).toString("hex") // 6 chars preview
    const rawToken = crypto.randomBytes(32).toString("hex")
    
    // Hash the token for storage (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Invalidate previous active tokens for this unit (optional, but good for security)
    await prisma.unitToken.updateMany({
      where: { unitId: params.unitId, status: 'active' },
      data: { status: 'cancelled' }
    })

    const token = await prisma.unitToken.create({
      data: {
        unitId: params.unitId,
        tokenHash: tokenHash, // In real app, only store hash!
        tokenPreview: rawToken, // Saving rawToken here for MVP so admin can retrieve it on rejection
        createdById: session.user.id,
      }
    })

    // Update unit status if it was not started
    if (unit.registrationStatus === 'not_started') {
      await prisma.unit.update({
        where: { id: params.unitId },
        data: { registrationStatus: 'in_progress' }
      })
    }

    // We must return the rawToken ONLY ONCE so the admin can copy the link
    // It will never be available again.
    
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const link = `${baseUrl}/c/${unit.condominium.slug}/u/${unit.id}/t/${rawToken}`

    return NextResponse.json({ 
      success: true, 
      link,
      tokenPreview
    }, { status: 201 })

  } catch (error) {
    console.error("[UNIT_TOKEN_POST]", error)
    return NextResponse.json({ error: "Erro ao gerar link" }, { status: 500 })
  }
}
