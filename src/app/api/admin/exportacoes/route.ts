import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stringify } from "csv-stringify/sync"
import fs from "fs"
import path from "path"
import { promisify } from "util"

import { ZipArchive } from "archiver"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { condominiumId, unitIds } = await req.json()
    if (!condominiumId) return new NextResponse("Condomínio ID obrigatório", { status: 400 })

    const condo = await prisma.condominium.findUnique({
      where: { id: condominiumId },
      include: {
        units: {
          where: unitIds && Array.isArray(unitIds) && unitIds.length > 0 ? { id: { in: unitIds } } : undefined,
          include: {
            submissions: {
              where: { status: 'approved' },
              include: {
                residents: true,
                vehicles: true,
                photos: true
              }
            }
          }
        }
      }
    })

    if (!condo) return new NextResponse("Condomínio não encontrado", { status: 404 })

    const exportsDir = path.join(process.cwd(), 'storage', 'exports')
    await fs.promises.mkdir(exportsDir, { recursive: true })

    const timestamp = Date.now()
    const zipFileName = `${condo.slug}_export_${timestamp}.zip`
    const zipFilePath = path.join(exportsDir, zipFileName)

    const output = fs.createWriteStream(zipFilePath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    
    // We wrap stream events in a Promise to wait for it
    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => resolve(true))
      archive.on('error', (err: any) => reject(err))
    })

    archive.pipe(output)

    // Prepare CSV Data
    const csvRecords = []
    const vehiclesRecords = []

    for (const unit of condo.units) {
      const sub = unit.submissions[0] // Approved submission
      if (!sub) continue

      const sortedResidents = [...sub.residents].sort((a, b) => {
        const orderA = a.contactOrder !== null && a.contactOrder !== undefined ? a.contactOrder : (a.residentType === 'primary_responsible' ? 1 : 99)
        const orderB = b.contactOrder !== null && b.contactOrder !== undefined ? b.contactOrder : (b.residentType === 'primary_responsible' ? 1 : 99)
        return orderA - orderB
      })

      for (const res of sortedResidents) {
        csvRecords.push({
          Bloco: unit.block || '',
          Unidade: unit.unitNumber,
          Nome: res.fullName,
          CPF: res.cpf,
          RG: res.rg,
          Telefone: res.phone,
          Telefone2: res.phone2 || '',
          Email: res.email,
          Tipo: res.residentType,
          Relacao: res.relationshipToUnit,
          Senha: res.password || '',
          SenhaSeguranca: res.securityPassword || '',
          OrdemContato: res.contactOrder || '',
          QtdTags: res.tagQuantity || 0,
          QtdControles: res.remoteQuantity || 0,
          Garagem: unit.garageBoxes || sub.garageBoxes || ''
        })
      }

      for (const veh of sub.vehicles) {
        vehiclesRecords.push({
          Bloco: unit.block || '',
          Unidade: unit.unitNumber,
          Placa: veh.plate,
          MarcaModelo: veh.brand || '',
          Cor: veh.color || ''
        })
      }

      for (const photo of sub.photos) {
        const photoPath = path.join(process.cwd(), 'storage', 'facial-photos', photo.filePath)
        try {
          // Verify if exists
          await fs.promises.access(photoPath)
          const resident = sub.residents.find(r => r.id === photo.residentId)
          const safeName = resident?.fullName.replace(/[^a-z0-9]/gi, '_') || 'desconhecido'
          const ext = path.extname(photo.originalFileName || '.jpg')
          const archivePath = `fotos/bloco_${unit.block || 'X'}_unidade_${unit.unitNumber}_${safeName}${ext}`
          
          archive.file(photoPath, { name: archivePath })
        } catch (e) {
          console.warn(`Foto não encontrada no disco: ${photoPath}`)
        }
      }
    }

    // Append CSVs
    if (csvRecords.length > 0) {
      const csvString = stringify(csvRecords, { header: true })
      archive.append(csvString, { name: 'moradores.csv' })
    }
    
    if (vehiclesRecords.length > 0) {
      const vehiclesCsvString = stringify(vehiclesRecords, { header: true })
      archive.append(vehiclesCsvString, { name: 'veiculos.csv' })
    }

    await archive.finalize()
    await archivePromise

    // Create ExportJob record
    await prisma.exportJob.create({
      data: {
        condominiumId: condo.id,
        exportType: 'full_package',
        status: 'completed',
        filePath: zipFileName,
        requestedById: session.user.id,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, downloadUrl: `/api/admin/exportacoes/download/${zipFileName}` })
  } catch (error) {
    console.error("[EXPORT_POST]", error)
    return new NextResponse("Erro interno", { status: 500 })
  }
}
