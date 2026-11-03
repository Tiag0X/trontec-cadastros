import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { block, unitNumber, initialResponsibleName, initialPhone, initialEmail } = body

    if (!unitNumber) {
      return NextResponse.json({ error: "O número da unidade é obrigatório." }, { status: 400 })
    }

    // Check if unit already exists
    const existing = await prisma.unit.findUnique({
      where: {
        condominiumId_block_unitNumber: {
          condominiumId: params.id,
          block: block || "",
          unitNumber
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Esta unidade já existe no condomínio." }, { status: 400 })
    }

    const unit = await prisma.unit.create({
      data: {
        condominiumId: params.id,
        block: block || "",
        unitNumber,
        initialResponsibleName: initialResponsibleName || null,
        initialPhone: initialPhone || null,
        initialEmail: initialEmail || null,
      }
    })

    return NextResponse.json({ success: true, unit }, { status: 201 })

  } catch (error) {
    console.error("[UNIT_CREATE]", error)
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
  }
}
