import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

export async function GET(req: Request, props: { params: Promise<{ filename: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const exportsDir = path.join(process.cwd(), 'storage', 'exports')
    const filePath = path.join(exportsDir, params.filename)

    // Security check to prevent directory traversal
    if (!filePath.startsWith(exportsDir)) {
      return new NextResponse("Invalid file path", { status: 400 })
    }

    try {
      const fileBuffer = await fs.readFile(filePath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${params.filename}"`,
        }
      })
    } catch (e) {
      return new NextResponse("Arquivo não encontrado", { status: 404 })
    }
  } catch (error) {
    console.error("[EXPORT_DOWNLOAD_GET]", error)
    return new NextResponse("Erro interno", { status: 500 })
  }
}
