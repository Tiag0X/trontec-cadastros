"use client"

import { useState, useEffect } from "react"
import { Download, Loader2, FileArchive, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function ExportacoesPage() {
  const [condominios, setCondominios] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal State
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [selectedCondo, setSelectedCondo] = useState<any>(null)
  const [condoUnits, setCondoUnits] = useState<any[]>([])
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingUnits, setIsLoadingUnits] = useState(false)

  useEffect(() => {
    const fetchCondominios = async () => {
      try {
        const res = await fetch("/api/admin/condominios")
        if (res.ok) {
          setCondominios(await res.json())
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCondominios()
  }, [])

  const openExportModal = async (condo: any) => {
    setSelectedCondo(condo)
    setIsModalOpen(true)
    setIsLoadingUnits(true)
    setSelectedUnitIds([])
    try {
      const res = await fetch(`/api/admin/condominios/${condo.id}`)
      if (res.ok) {
        const data = await res.json()
        setCondoUnits(data.units || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingUnits(false)
    }
  }

  const handleExport = async () => {
    if (!selectedCondo) return
    setIsExporting(selectedCondo.id)
    try {
      const res = await fetch("/api/admin/exportacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          condominiumId: selectedCondo.id,
          unitIds: selectedUnitIds.length > 0 ? selectedUnitIds : undefined
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.downloadUrl) {
          // Trigger file download
          window.location.href = data.downloadUrl
          setIsModalOpen(false)
        }
      } else {
        alert("Erro ao gerar exportação.")
      }
    } catch (e) {
      alert("Falha na conexão.")
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exportações</h2>
          <p className="text-muted-foreground">
            Exporte os dados aprovados (CSV + Fotos) para importar no Trontec Access
          </p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condomínio</TableHead>
              <TableHead>Unidades Totais</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : condominios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Nenhum condomínio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              condominios.map((condo) => (
                <TableRow key={condo.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {condo.name}
                    </div>
                  </TableCell>
                  <TableCell>{condo._count.units}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      onClick={() => openExportModal(condo)}
                      disabled={isExporting === condo.id}
                    >
                      {isExporting === condo.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileArchive className="mr-2 h-4 w-4" />
                      )}
                      Gerar Pacote ZIP
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Export Options Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Opções de Exportação</DialogTitle>
            <DialogDescription>
              {selectedCondo?.name} - Escolha quais unidades exportar
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoadingUnits ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : condoUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada neste condomínio.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2 pb-3 border-b">
                    <input 
                      type="checkbox" 
                      id="selectAll"
                      className="rounded border-gray-300 w-4 h-4 cursor-pointer accent-primary"
                      checked={selectedUnitIds.length === condoUnits.length && condoUnits.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUnitIds(condoUnits.map(u => u.id))
                        } else {
                          setSelectedUnitIds([])
                        }
                      }}
                    />
                    <label htmlFor="selectAll" className="font-semibold cursor-pointer select-none">
                      Selecionar Todas ({condoUnits.length})
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {condoUnits.map(unit => (
                      <div key={unit.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox"
                          id={`unit-${unit.id}`}
                          className="rounded border-gray-300 w-4 h-4 cursor-pointer accent-primary"
                          checked={selectedUnitIds.includes(unit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnitIds([...selectedUnitIds, unit.id])
                            } else {
                              setSelectedUnitIds(selectedUnitIds.filter(id => id !== unit.id))
                            }
                          }}
                        />
                        <label htmlFor={`unit-${unit.id}`} className="text-sm cursor-pointer select-none">
                          {unit.block ? `Bl ${unit.block} - ` : ''}Apt {unit.unitNumber}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport} disabled={!!isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
              {selectedUnitIds.length > 0 && selectedUnitIds.length < condoUnits.length ? `Exportar ${selectedUnitIds.length} unidades` : "Exportar Todas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
