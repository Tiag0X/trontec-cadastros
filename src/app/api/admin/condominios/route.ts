import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function generateSlug(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const condominios = await prisma.condominium.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { units: true }
        }
      }
    })

    return NextResponse.json(condominios)
  } catch (error) {
    console.error("[CONDOMINIOS_GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, documentNumber, managerName, managerPhone, administratorName, administratorPhone } = body

    if (!name) {
      return NextResponse.json({ error: "Nome do condomínio é obrigatório" }, { status: 400 })
    }

    let baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 1
    
    // Ensure unique slug
    while (await prisma.condominium.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const condominio = await prisma.condominium.create({
      data: {
        name,
        slug,
        documentNumber,
        managerName,
        managerPhone,
        administratorName,
        administratorPhone,
        createdById: session.user.id
      }
    })

    return NextResponse.json(condominio, { status: 201 })
  } catch (error) {
    console.error("[CONDOMINIOS_POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
