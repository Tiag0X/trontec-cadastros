import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs/promises"
import path from "path"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const photo = await prisma.facialPhoto.findUnique({
      where: { id: params.id }
    })

    if (!photo) {
      return new NextResponse("Photo not found", { status: 404 })
    }

    const uploadDir = path.join(process.cwd(), 'storage', 'facial-photos')
    const filePath = path.join(uploadDir, photo.filePath)

    try {
      const fileBuffer = await fs.readFile(filePath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": photo.mimeType || "image/jpeg",
          "Cache-Control": "public, max-age=86400"
        }
      })
    } catch (e) {
      return new NextResponse("File not found on disk", { status: 404 })
    }
  } catch (error) {
    console.error("[PHOTO_VIEW_GET]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
