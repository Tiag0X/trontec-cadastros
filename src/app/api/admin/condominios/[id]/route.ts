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

    const condominio = await prisma.condominium.findUnique({
      where: { id: params.id },
      include: {
        units: {
          orderBy: [{ block: 'asc' }, { unitNumber: 'asc' }],
          include: {
            tokens: {
              where: { status: 'active' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    if (!condominio) {
      return NextResponse.json({ error: "Condomínio não encontrado" }, { status: 404 })
    }

    return NextResponse.json(condominio)
  } catch (error) {
    console.error("[CONDOMINIO_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
