"use client"

import { useState, useEffect, use } from "react"
import { Building2, Upload, Link as LinkIcon, Loader2, Check, Copy, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

type Unit = {
  id: string
  block: string | null
  unitNumber: string
  initialResponsibleName: string | null
  registrationStatus: string
  tokens: { tokenPreview: string }[]
}

type Condominio = {
  id: string
  name: string
  slug: string
  units: Unit[]
}

export default function CondominioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const [condo, setCondo] = useState<Condominio | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isCreateUnitDialogOpen, setIsCreateUnitDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [unitForm, setUnitForm] = useState({ block: '', unitNumber: '', initialResponsibleName: '', initialPhone: '', initialEmail: '' })

  const fetchCondo = async () => {
    try {
      const res = await fetch(`/api/admin/condominios/${id}`)
      if (res.ok) {
        setCondo(await res.json())
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCondo()
  }, [id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/admin/condominios/${id}/units/import`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (res.ok) {
        alert(`Importação concluída: ${data.created} unidades criadas, ${data.skipped} ignoradas.`)
        setIsImportDialogOpen(false)
        fetchCondo()
      } else {
        alert(`Erro na importação: ${data.error || "Erro desconhecido"}`)
      }
    } catch (error) {
      alert("Falha ao conectar com o servidor.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch(`/api/admin/condominios/${id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Unidade criada com sucesso!")
        setIsCreateUnitDialogOpen(false)
        setUnitForm({ block: '', unitNumber: '', initialResponsibleName: '', initialPhone: '', initialEmail: '' })
        fetchCondo()
      } else {
        alert(`Erro: ${data.error || "Falha ao criar unidade"}`)
      }
    } catch (error) {
      alert("Falha ao conectar com o servidor.")
    } finally {
      setIsCreating(false)
    }
  }

  const generateLink = async (unitId: string) => {
    setGeneratingFor(unitId)
    try {
      const res = await fetch(`/api/admin/condominios/${id}/units/${unitId}/token`, {
        method: "POST",
      })
      const data = await res.json()

      if (res.ok) {
        navigator.clipboard.writeText(data.link)
        alert("O link único da unidade foi copiado para sua área de transferência!")
        fetchCondo()
      } else {
        alert(`Erro: ${data.error || "Erro ao gerar link"}`)
      }
    } catch (error) {
      alert("Falha ao gerar o link.")
    } finally {
      setGeneratingFor(null)
    }
  }

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (!condo) {
    return <div>Condomínio não encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/condominios" className="text-sm text-primary hover:underline">
              Voltar
            </Link>
          </div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {condo.name}
          </h2>
          <p className="text-muted-foreground">
            Total de unidades cadastradas: {condo.units.length}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isCreateUnitDialogOpen} onOpenChange={setIsCreateUnitDialogOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Unidade
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Unidade</DialogTitle>
                <DialogDescription>
                  Adicione uma unidade manualmente ao condomínio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUnit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="block">Bloco (Opcional)</Label>
                    <Input 
                      id="block" 
                      value={unitForm.block} 
                      onChange={(e) => setUnitForm({...unitForm, block: e.target.value})} 
                      placeholder="Ex: A" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitNumber">Unidade *</Label>
                    <Input 
                      id="unitNumber" 
                      value={unitForm.unitNumber} 
                      onChange={(e) => setUnitForm({...unitForm, unitNumber: e.target.value})} 
                      placeholder="Ex: 101" 
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialResponsibleName">Nome do Responsável (Opcional)</Label>
                  <Input 
                    id="initialResponsibleName" 
                    value={unitForm.initialResponsibleName} 
                    onChange={(e) => setUnitForm({...unitForm, initialResponsibleName: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialPhone">Telefone (Opcional)</Label>
                    <Input 
                      id="initialPhone" 
                      value={unitForm.initialPhone} 
                      onChange={(e) => setUnitForm({...unitForm, initialPhone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialEmail">E-mail (Opcional)</Label>
                    <Input 
                      id="initialEmail" 
                      type="email"
                      value={unitForm.initialEmail} 
                      onChange={(e) => setUnitForm({...unitForm, initialEmail: e.target.value})} 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar Unidade
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Unidades</DialogTitle>
              <DialogDescription>
                Faça o upload de um arquivo CSV contendo as colunas: Bloco, Unidade, Nome, Telefone, Email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                disabled={isUploading}
              />
              {isUploading && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando arquivo...
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bloco</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {condo.units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhuma unidade cadastrada. Importe um arquivo CSV.
                </TableCell>
              </TableRow>
            ) : (
              condo.units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>{unit.block || "-"}</TableCell>
                  <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                  <TableCell>{unit.initialResponsibleName || "-"}</TableCell>
                  <TableCell>
                    {unit.registrationStatus === "not_started" && <span className="text-muted-foreground text-sm">Não iniciado</span>}
                    {unit.registrationStatus === "in_progress" && <span className="text-blue-500 text-sm">Em andamento</span>}
                    {unit.registrationStatus === "submitted" && <span className="text-yellow-500 text-sm">Aguardando revisão</span>}
                    {unit.registrationStatus === "approved" && <span className="text-green-500 text-sm">Aprovado</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateLink(unit.id)}
                      disabled={generatingFor === unit.id}
                    >
                      {generatingFor === unit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Gerar Link Único
                        </>
                      )}
                    </Button>
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
