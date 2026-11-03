import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminEmail = 'admin@trontec.com.br'
  const adminPassword = await bcrypt.hash('trontec2026', 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
    },
  })
  console.log(`Created admin user: ${admin.email}`)

  // Create standard terms
  const terms = [
    {
      type: 'general_registration' as const,
      title: 'Termo Geral de Atualização Cadastral',
      version: '1.0',
      content: 'Autorizo a administração do condomínio a atualizar e armazenar os meus dados para fins de segurança e controle de acesso.',
    },
    {
      type: 'privacy_policy' as const,
      title: 'Política de Privacidade e LGPD',
      version: '1.0',
      content: 'Os dados fornecidos serão tratados conforme a Lei Geral de Proteção de Dados (LGPD), com finalidade exclusiva de segurança condominial.',
    },
    {
      type: 'facial_authorization' as const,
      title: 'Autorização de Uso de Imagem Facial',
      version: '1.0',
      content: 'Autorizo o tratamento da minha imagem facial para fins exclusivos de identificação e controle de acesso ao condomínio, conforme as regras internas de segurança e a política de privacidade aplicável.\n\nDeclaro estar ciente de que meus dados serão utilizados apenas para cadastro, validação de identidade, controle de acesso e segurança condominial, podendo ser acessados somente por pessoas autorizadas e operadores necessários à prestação do serviço.\n\nEstou ciente de que posso solicitar informações, correção ou exclusão dos meus dados, observadas as regras legais, contratuais e operacionais aplicáveis ao condomínio.',
    },
  ]

  for (const term of terms) {
    await prisma.term.create({
      data: {
        type: term.type,
        title: term.title,
        version: term.version,
        content: term.content,
        createdById: admin.id,
      },
    })
  }
  console.log(`Created ${terms.length} standard terms.`)

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
