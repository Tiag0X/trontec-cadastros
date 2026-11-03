"use client"

import { use, useEffect, useState } from "react"
import { Check, X, Loader2, ArrowLeft, Image as ImageIcon, Copy, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CadastroReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [sub, setSub] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`/api/admin/cadastros/${id}`)
      if (res.ok) {
        setSub(await res.json())
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmission()
  }, [id])

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!confirm(`Tem certeza que deseja ${status === 'approved' ? 'APROVAR' : 'REJEITAR'} este cadastro?`)) return
    
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/admin/cadastros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        alert("Status atualizado com sucesso!")
        router.push("/admin/cadastros")
      } else {
        alert("Erro ao atualizar status.")
      }
    } catch (e) {
      alert("Falha na conexão.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!sub) return <div className="p-10">Cadastro não encontrado.</div>

  const responsible = sub.residents.find((r: any) => r.residentType === 'primary_responsible')
  const dependents = sub.residents
    .filter((r: any) => r.residentType !== 'primary_responsible')
    .sort((a: any, b: any) => (a.contactOrder || 99) - (b.contactOrder || 99))

  const getRejectionLink = () => {
    if (!sub || !sub.token || !sub.token.tokenPreview) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/c/${sub.unit.condominium.slug}/u/${sub.unitId}/t/${sub.token.tokenPreview}`
  }

  const copyLink = () => {
    navigator.clipboard.writeText(getRejectionLink())
    alert("Link copiado para a área de transferência!")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/admin/cadastros">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revisão de Cadastro</h2>
          <p className="text-muted-foreground">
            {sub.unit.condominium.name} - {sub.unit.block ? `${sub.unit.block} / ` : ''}Unidade {sub.unit.unitNumber}
            {sub.garageBoxes && ` | Garagem: ${sub.garageBoxes}`}
          </p>
        </div>
      </div>

      {sub.status === 'rejected' && sub.token && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <h3 className="text-yellow-800 font-medium mb-2 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" /> Cadastro Rejeitado
          </h3>
          {sub.token.tokenPreview && sub.token.tokenPreview.length > 20 ? (
            <>
              <p className="text-sm text-yellow-700 mb-4">
                O link abaixo foi reativado. Envie-o novamente para o morador realizar as correções necessárias.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white p-2 rounded border text-xs overflow-x-auto text-yellow-900">
                  {getRejectionLink()}
                </code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-yellow-700">
              Este cadastro foi rejeitado, mas o link antigo não pode ser recuperado por questões de segurança (foi gerado antes da atualização do sistema). 
              Por favor, acesse a página do <strong>Condomínio &gt; Unidades</strong> e gere um novo link para o morador.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Responsável Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Nome:</strong> {responsible?.fullName}</p>
              <p><strong>Vínculo com o Apto:</strong> {responsible?.relationshipToUnit || '-'}</p>
              <p><strong>CPF:</strong> {responsible?.cpf}</p>
              <p><strong>RG:</strong> {responsible?.rg || '-'}</p>
              <p><strong>Telefone 1:</strong> {responsible?.phone}</p>
              <p><strong>Telefone 2:</strong> {responsible?.phone2 || '-'}</p>
              <p><strong>E-mail:</strong> {responsible?.email}</p>
              <p><strong>Senha:</strong> {responsible?.password ? '******' : '-'}</p>
              <p><strong>Senha de Segurança:</strong> {responsible?.securityPassword ? '******' : '-'}</p>
              <p><strong>Prioridade de Contato:</strong> {responsible?.contactOrder ? `${responsible.contactOrder}º` : '-'}</p>
              {((responsible?.tagQuantity && responsible.tagQuantity > 0) || (responsible?.remoteQuantity && responsible.remoteQuantity > 0)) && (
                <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded text-xs border border-blue-100">
                  <p className="font-semibold mb-1">Solicitações Físicas:</p>
                  <ul className="list-disc list-inside">
                    {responsible?.tagQuantity && responsible.tagQuantity > 0 ? <li>Tags de Acesso: {responsible.tagQuantity}</li> : null}
                    {responsible?.remoteQuantity && responsible.remoteQuantity > 0 ? <li>Controles Remotos: {responsible.remoteQuantity}</li> : null}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dependentes / Autorizados ({dependents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dependents.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum dependente.</p> : (
                <ul className="space-y-4">
                  {dependents.map((d: any) => (
                    <li key={d.id} className="text-sm border-b pb-2 last:border-0">
                      <div className="font-medium flex justify-between items-center">
                        <span>{d.fullName}</span>
                        {d.contactOrder && (
                          <span className="bg-muted px-2 py-0.5 rounded text-xs font-semibold">
                            {d.contactOrder}º Contato
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1">CPF: {d.cpf} | Relação: {d.relationshipToUnit}</p>
                      <p className="text-muted-foreground">Tel 1: {d.phone} | Tel 2: {d.phone2 || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Senha: {d.password ? '******' : '-'} | Senha de Segurança: {d.securityPassword ? '******' : '-'}</p>
                      {((d.tagQuantity && d.tagQuantity > 0) || (d.remoteQuantity && d.remoteQuantity > 0)) && (
                        <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded text-xs border border-blue-100">
                          <p className="font-semibold mb-1">Solicitações Físicas:</p>
                          <ul className="list-disc list-inside">
                            {d.tagQuantity && d.tagQuantity > 0 ? <li>Tags de Acesso: {d.tagQuantity}</li> : null}
                            {d.remoteQuantity && d.remoteQuantity > 0 ? <li>Controles Remotos: {d.remoteQuantity}</li> : null}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Veículos ({sub.vehicles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sub.vehicles.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum veículo.</p> : (
                <ul className="space-y-4">
                  {sub.vehicles.map((v: any) => (
                    <li key={v.id} className="text-sm border-b pb-2 last:border-0">
                      <p className="font-medium">{v.plate}</p>
                      <p className="text-muted-foreground">{v.brand} {v.model} - {v.color}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fotos Faciais ({sub.photos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sub.photos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma foto enviada.</p> : (
                <div className="grid grid-cols-2 gap-4">
                  {sub.photos.map((p: any) => {
                    const res = sub.residents.find((r: any) => r.id === p.residentId)
                    return (
                      <div key={p.id} className="border rounded-md overflow-hidden bg-muted">
                        <img 
                          src={`/api/admin/photos/${p.id}/view`} 
                          alt="Foto Facial" 
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50" x="10">No Image</text></svg>'
                          }}
                        />
                        <div className="p-2 text-xs text-center truncate bg-background border-t">
                          {res?.fullName || 'Desconhecido'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
        <Button 
          variant="destructive" 
          onClick={() => handleReview('rejected')} 
          disabled={isProcessing || sub.status !== 'submitted'}
        >
          <X className="mr-2 h-4 w-4" /> Rejeitar
        </Button>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white" 
          onClick={() => handleReview('approved')}
          disabled={isProcessing || sub.status !== 'submitted'}
        >
          <Check className="mr-2 h-4 w-4" /> Aprovar Cadastro
        </Button>
      </div>
    </div>
  )
}
