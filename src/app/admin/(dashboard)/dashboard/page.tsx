import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileCheck2, Clock } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  // Fetch some summary stats
  const [
    totalCondos,
    pendingReviews,
    totalUnits,
    totalResidents
  ] = await Promise.all([
    prisma.condominium.count(),
    prisma.registrationSubmission.count({ where: { status: 'submitted' } }),
    prisma.unit.count(),
    prisma.resident.count()
  ])

  const stats = [
    {
      title: "Condomínios",
      value: totalCondos,
      icon: Building2,
      description: "Cadastrados no sistema",
    },
    {
      title: "Unidades",
      value: totalUnits,
      icon: Users,
      description: "Total de unidades",
    },
    {
      title: "Revisões Pendentes",
      value: pendingReviews,
      icon: Clock,
      description: "Aguardando aprovação",
    },
    {
      title: "Moradores",
      value: totalResidents,
      icon: FileCheck2,
      description: "Registrados no total",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Visão geral do sistema de recadastramento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="transition-colors hover:ring-foreground/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
