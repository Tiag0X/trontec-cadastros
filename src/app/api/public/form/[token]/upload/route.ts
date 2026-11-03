import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const rawToken = params.token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    
    const tokenRecord = await prisma.unitToken.findUnique({
      where: { tokenHash },
      include: {
        unit: {
          include: {
            submissions: {
              where: { status: { in: ['draft', 'submitted', 'under_review', 'pending', 'rejected'] } },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    if (!tokenRecord || tokenRecord.status !== 'active') {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 })
    }

    let submissionId = tokenRecord.unit.submissions[0]?.id
    if (!submissionId) {
      // Cria submission draft se não existir
      const sub = await prisma.registrationSubmission.create({
        data: {
          unitId: tokenRecord.unit.id,
          tokenId: tokenRecord.id,
          status: 'draft'
        }
      })
      submissionId = sub.id
    }

    const formData = await req.formData()
    const file = formData.get("photo") as File
    const residentId = formData.get("residentId") as string

    if (!file || !residentId) {
      return NextResponse.json({ error: "Arquivo ou ID do morador ausente" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = path.extname(file.name) || '.jpg'
    const fileName = `${submissionId}_${residentId}_${Date.now()}${fileExt}`
    
    // Caminho da pasta
    const uploadDir = path.join(process.cwd(), 'storage', 'facial-photos')
    
    // Garantir que existe
    await fs.mkdir(uploadDir, { recursive: true })
    
    const filePath = path.join(uploadDir, fileName)
    
    // Salvar arquivo físico
    await fs.writeFile(filePath, buffer)

    // Criar registro no banco
    const photo = await prisma.facialPhoto.create({
      data: {
        residentId: residentId,
        submissionId: submissionId,
        unitId: tokenRecord.unit.id,
        filePath: fileName,
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        status: 'submitted'
      }
    })

    return NextResponse.json({ success: true, photo })

  } catch (error) {
    console.error("[PUBLIC_UPLOAD]", error)
    return NextResponse.json({ error: "Erro interno no upload" }, { status: 500 })
  }
}
