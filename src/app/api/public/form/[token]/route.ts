import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Helper to validate and return token + unit + condominium
async function validateToken(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  
  const tokenRecord = await prisma.unitToken.findUnique({
    where: { tokenHash },
    include: {
      unit: {
        include: {
          condominium: true,
          submissions: {
            where: { status: { in: ['draft', 'submitted', 'under_review', 'pending', 'rejected'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              residents: true,
              vehicles: true
            }
          }
        }
      }
    }
  })

  if (!tokenRecord || tokenRecord.status !== 'active') {
    return null
  }

  return tokenRecord
}

export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const tokenRecord = await validateToken(params.token)
    
    if (!tokenRecord) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 403 })
    }

    // Registrar acesso
    await prisma.unitToken.update({
      where: { id: tokenRecord.id },
      data: { 
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 }
      }
    })

    // Fetch active terms
    const activeTerms = await prisma.term.findMany({
      where: { isActive: true },
      select: { id: true, title: true, content: true }
    })

    return NextResponse.json({
      unit: tokenRecord.unit,
      condominium: tokenRecord.unit.condominium,
      existingSubmission: tokenRecord.unit.submissions[0] || null,
      terms: activeTerms
    })

  } catch (error) {
    console.error("[PUBLIC_FORM_GET]", error)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const tokenRecord = await validateToken(params.token)
    if (!tokenRecord) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 403 })
    }

    const body = await req.json()
    const { action, responsible, residents, vehicles, photos, termAccepts, garageBoxes } = body

    // action pode ser "save_draft" ou "submit"

    let submissionId = tokenRecord.unit.submissions[0]?.id

    // Se não tem submission ainda, cria uma draft
    if (!submissionId) {
      const sub = await prisma.registrationSubmission.create({
        data: {
          unitId: tokenRecord.unit.id,
          tokenId: tokenRecord.id,
          status: 'draft',
          garageBoxes,
          sourceIp: req.headers.get("x-forwarded-for") || 'unknown',
          userAgent: req.headers.get("user-agent") || 'unknown'
        }
      })
      submissionId = sub.id
    } else {
      await prisma.registrationSubmission.update({
        where: { id: submissionId },
        data: { garageBoxes }
      })
    }

    // Save responsible (as ResidentType.primary_responsible)
    let responsibleId = null
    if (responsible) {
      const { id: _, passwordConfirm: _pc, securityPasswordConfirm: _spc, ...responsibleData } = responsible
      const respExists = await prisma.resident.findFirst({
        where: { submissionId, residentType: 'primary_responsible' }
      })

      if (respExists) {
        responsibleId = respExists.id
        await prisma.resident.update({
          where: { id: respExists.id },
          data: { ...responsibleData }
        })
      } else {
        const newResp = await prisma.resident.create({
          data: {
            ...responsibleData,
            submissionId,
            unitId: tokenRecord.unit.id,
            residentType: 'primary_responsible',
            status: 'submitted'
          }
        })
        responsibleId = newResp.id
      }
    }

    // Process Residents
    let updatedResidents = []
    if (residents && Array.isArray(residents)) {
      const incomingIds = residents.map((r: any) => r.id).filter(Boolean)
      
      // Remover antigos não enviados
      await prisma.resident.deleteMany({
        where: { 
          submissionId, 
          residentType: { not: 'primary_responsible' },
          id: { notIn: incomingIds.length > 0 ? incomingIds : ['dummy-id'] }
        }
      })

      for (const res of residents) {
        if (res.id) {
          const updated = await prisma.resident.update({
            where: { id: res.id },
            data: {
              fullName: res.fullName,
              cpf: res.cpf,
              rg: res.rg,
              phone: res.phone,
              phone2: res.phone2,
              email: res.email,
              relationshipToUnit: res.relationshipToUnit,
              password: res.password,
              securityPassword: res.securityPassword,
              contactOrder: res.contactOrder,
              tagQuantity: res.tagQuantity,
              remoteQuantity: res.remoteQuantity
            }
          })
          updatedResidents.push(updated)
        } else {
          const created = await prisma.resident.create({
            data: {
              fullName: res.fullName,
              cpf: res.cpf,
              rg: res.rg,
              phone: res.phone,
              phone2: res.phone2,
              email: res.email,
              relationshipToUnit: res.relationshipToUnit,
              password: res.password,
              securityPassword: res.securityPassword,
              contactOrder: res.contactOrder,
              tagQuantity: res.tagQuantity || 0,
              remoteQuantity: res.remoteQuantity || 0,
              submissionId,
              unitId: tokenRecord.unit.id,
              status: 'submitted'
            }
          })
          updatedResidents.push(created)
        }
      }
    }

    // Process Vehicles
    if (vehicles && Array.isArray(vehicles)) {
      await prisma.vehicle.deleteMany({ where: { submissionId } })

      for (const veh of vehicles) {
        const { id: _, ...vehData } = veh
        await prisma.vehicle.create({
          data: {
            ...vehData,
            submissionId,
            unitId: tokenRecord.unit.id,
            status: 'submitted'
          }
        })
      }
    }

    // Terms
    if (action === 'submit') {
      const activeTerms = await prisma.term.findMany({ where: { isActive: true } })
      
      for (const term of activeTerms) {
        const existingAccept = await prisma.termAcceptance.findFirst({
           where: { termId: term.id, submissionId }
        })
        
        if (!existingAccept) {
          await prisma.termAcceptance.create({
            data: {
              termId: term.id,
              submissionId,
              unitId: tokenRecord.unit.id,
              acceptedByName: responsible?.fullName || 'Responsável',
              ip: req.headers.get("x-forwarded-for") || 'unknown',
              userAgent: req.headers.get("user-agent") || 'unknown'
            }
          })
        }
      }
    }

    // Submitting completely
    if (action === 'submit') {
      await prisma.registrationSubmission.update({
        where: { id: submissionId },
        data: { 
          status: 'submitted',
          submittedAt: new Date()
        }
      })
      
      await prisma.unit.update({
        where: { id: tokenRecord.unit.id },
        data: { registrationStatus: 'submitted' }
      })

      await prisma.unitToken.update({
        where: { id: tokenRecord.id },
        data: { status: 'used' }
      })
    }

    return NextResponse.json({ success: true, submissionId, responsibleId, residents: updatedResidents })
  } catch (error) {
    console.error("[PUBLIC_FORM_POST]", error)
    return NextResponse.json({ error: "Erro interno ao salvar dados." }, { status: 500 })
  }
}
