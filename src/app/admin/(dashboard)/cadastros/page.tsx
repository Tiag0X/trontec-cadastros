"use client"

import { useState, useEffect } from "react"
import { FileCheck2, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export default function CadastrosPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("submitted")

  const fetchSubmissions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/cadastros?status=${statusFilter}`)
      if (res.ok) {
        setSubmissions(await res.json())
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [statusFilter])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Revisão de Cadastros</h2>
          <p className="text-sm text-muted-foreground">
            Analise e aprove os dados enviados pelos moradores
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'submitted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('submitted')}
        >
          Pendentes
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
        >
          Aprovados
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('rejected')}
        >
          Rejeitados
        </Button>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Condomínio</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Moradores</TableHead>
              <TableHead>Veículos</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <FileCheck2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Nenhum cadastro encontrado</p>
                      <p className="text-xs text-muted-foreground">
                        Não há cadastros com este status no momento.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.unit.condominium.name}</TableCell>
                  <TableCell>{sub.unit.block ? `${sub.unit.block} - ` : ''}{sub.unit.unitNumber}</TableCell>
                  <TableCell>{sub._count.residents}</TableCell>
                  <TableCell>{sub._count.vehicles}</TableCell>
                  <TableCell>{new Date(sub.submittedAt || sub.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/cadastros/${sub.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> Analisar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
