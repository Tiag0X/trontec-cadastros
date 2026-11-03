import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parse } from "csv-parse/sync"

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    }

    const fileText = await file.text()
    
    // Parse CSV
    // Expecting columns like: Bloco, Unidade, Nome, Telefone, Email
    const records = parse(fileText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "CSV vazio ou inválido" }, { status: 400 })
    }

    let createdCount = 0
    let skippedCount = 0

    // Import units
    for (const record of records as any[]) {
      const block = record["Bloco"] || record["bloco"] || ""
      const unitNumber = record["Unidade"] || record["unidade"]
      const name = record["Nome"] || record["nome"] || null
      const phone = record["Telefone"] || record["telefone"] || null
      const email = record["Email"] || record["email"] || null

      if (!unitNumber) {
        skippedCount++
        continue
      }

      // Check if unit already exists
      const existing = await prisma.unit.findUnique({
        where: {
          condominiumId_block_unitNumber: {
            condominiumId: params.id,
            block,
            unitNumber
          }
        }
      })

      if (!existing) {
        await prisma.unit.create({
          data: {
            condominiumId: params.id,
            block,
            unitNumber,
            initialResponsibleName: name,
            initialPhone: phone,
            initialEmail: email,
          }
        })
        createdCount++
      } else {
        skippedCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      created: createdCount, 
      skipped: skippedCount 
    }, { status: 200 })

  } catch (error) {
    console.error("[UNITS_IMPORT]", error)
    return NextResponse.json({ error: "Erro ao processar CSV" }, { status: 500 })
  }
}
