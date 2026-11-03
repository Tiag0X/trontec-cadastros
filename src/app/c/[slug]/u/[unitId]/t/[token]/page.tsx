"use client"

import { use, useEffect, useState, useRef } from "react"
import { Building2, Camera, Car, Check, ChevronRight, Info, Loader2, Plus, Trash2, User, Users, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Resident = {
  id?: string
  fullName: string
  cpf: string
  rg: string
  phone: string
  phone2?: string
  email: string
  relationshipToUnit: string
  residentType?: string
  password?: string
  passwordConfirm?: string
  securityPassword?: string
  securityPasswordConfirm?: string
  contactOrder?: number
  tagQuantity?: number
  remoteQuantity?: number
}

type Vehicle = {
  id?: string
  plate: string
  vehicleType: 'car' | 'motorcycle' | 'bike' | 'other'
  brand: string
  model: string
  color: string
}

export default function PublicFormPage({ params }: { params: Promise<{ slug: string, unitId: string, token: string }> }) {
  const { slug, unitId, token } = use(params)
  
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [isFinished, setIsFinished] = useState(false)
  
  const [condoInfo, setCondoInfo] = useState<any>(null)
  
  // Form Data
  const [garageBoxes, setGarageBoxes] = useState("")
  const [responsible, setResponsible] = useState<Resident>({
    fullName: "", cpf: "", rg: "", phone: "", phone2: "", email: "", relationshipToUnit: "Proprietário", tagQuantity: 0, remoteQuantity: 0, contactOrder: 1
  })
  const [residents, setResidents] = useState<Resident[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  
  const [unit, setUnit] = useState<any>(null)
  const [terms, setTerms] = useState<any[]>([])
  
  // For photo upload simulation
  const [photos, setPhotos] = useState<any[]>([])
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    // Validate token and load initial data
    const init = async () => {
      try {
        const res = await fetch(`/api/public/form/${token}`)
        if (!res.ok) {
          setError("Link inválido, expirado ou já utilizado.")
          setIsLoading(false)
          return
        }
        
        const data = await res.json()
        setCondoInfo(data.condominium)
        setUnit(data.unit)
        if (data.terms) setTerms(data.terms)
        
        if (data.unit.initialResponsibleName) {
          setResponsible(prev => ({ ...prev, fullName: data.unit.initialResponsibleName }))
        }
        
        // Load drafts if available
        if (data.existingSubmission) {
          const sub = data.existingSubmission
          setGarageBoxes(sub.garageBoxes || "")
          
          if (sub.residents && sub.residents.length > 0) {
            const primary = sub.residents.find((r: any) => r.residentType === 'primary_responsible')
            const deps = sub.residents.filter((r: any) => r.residentType !== 'primary_responsible')
            
            if (primary) {
              setResponsible({
                id: primary.id,
                fullName: primary.fullName || "",
                cpf: primary.cpf || "",
                rg: primary.rg || "",
                phone: primary.phone || "",
                phone2: primary.phone2 || "",
                email: primary.email || "",
                relationshipToUnit: primary.relationshipToUnit || "Proprietário",
                password: primary.password || "",
                passwordConfirm: primary.password || "",
                securityPassword: primary.securityPassword || "",
                securityPasswordConfirm: primary.securityPassword || "",
                tagQuantity: primary.tagQuantity || 0,
                remoteQuantity: primary.remoteQuantity || 0,
                contactOrder: primary.contactOrder || 1
              })
            }
            if (deps.length > 0) {
              setResidents(deps.map((d: any) => ({
                id: d.id,
                fullName: d.fullName || "",
                cpf: d.cpf || "",
                rg: d.rg || "",
                phone: d.phone || "",
                phone2: d.phone2 || "",
                email: d.email || "",
                relationshipToUnit: d.relationshipToUnit || "",
                password: d.password || "",
                passwordConfirm: d.password || "",
                securityPassword: d.securityPassword || "",
                securityPasswordConfirm: d.securityPassword || "",
                tagQuantity: d.tagQuantity || 0,
                remoteQuantity: d.remoteQuantity || 0,
                contactOrder: d.contactOrder || 2
              })))
            }
          }

          if (sub.vehicles && sub.vehicles.length > 0) {
            setVehicles(sub.vehicles.map((v: any) => ({
              id: v.id,
              plate: v.plate || "",
              brand: v.brand || "",
              model: v.model || "",
              color: v.color || "",
              vehicleType: v.vehicleType || "car"
            })))
          }
        }
        
      } catch (e) {
        setError("Ocorreu um erro ao carregar o formulário.")
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [token])

  const saveDraft = async () => {
    try {
      const res = await fetch(`/api/public/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_draft",
          responsible,
          residents,
          vehicles,
          garageBoxes
        })
      })
      const data = await res.json()
      if (data.success) {
        if (data.responsibleId) {
          setResponsible(prev => ({ ...prev, id: data.responsibleId }))
        }
        if (data.residents) {
          setResidents(data.residents)
        }
      }
    } catch (e) {
      console.error("Erro ao salvar rascunho", e)
    }
  }

  const nextStep = async () => {
    if (step === 1) {
      if (!responsible.fullName) { alert("Nome Completo é obrigatório."); return; }
      if (!responsible.cpf) { alert("CPF é obrigatório."); return; }
      if (!responsible.phone) { alert("Telefone Celular (Principal) é obrigatório."); return; }
      if (!responsible.email) { alert("E-mail é obrigatório."); return; }
      if (!garageBoxes) { alert("Garagem Utilizada é obrigatória."); return; }

      if (responsible.password !== responsible.passwordConfirm) {
        alert("A Senha de Acesso não confere com a confirmação.")
        return
      }
      if (responsible.securityPassword !== responsible.securityPasswordConfirm) {
        alert("A Senha de Segurança não confere com a confirmação.")
        return
      }
    }
    if (step === 2) {
      for (let i = 0; i < residents.length; i++) {
        if (residents[i].password !== residents[i].passwordConfirm) {
          alert(`A Senha de Acesso do dependente ${i + 1} não confere com a confirmação.`)
          return
        }
        if (residents[i].securityPassword !== residents[i].securityPasswordConfirm) {
          alert(`A Senha de Segurança do dependente ${i + 1} não confere com a confirmação.`)
          return
        }
      }
    }
    setIsSaving(true)
    await saveDraft()
    setIsSaving(false)
    setStep(s => s + 1)
  }
  
  const prevStep = () => setStep(s => s - 1)

  const PhotoUploadButton = ({ residentId, token }: { residentId?: string, token: string }) => {
    const [isUploading, setIsUploading] = useState(false)
    const [isUploaded, setIsUploaded] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const openCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("Camera access denied", err)
        alert("Não foi possível acessar a câmera. Você pode usar o envio de arquivo como alternativa.")
      }
    }

    const closeCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }

    useEffect(() => {
      if (isCameraOpen) {
        openCamera()
      } else {
        closeCamera()
      }
      return () => closeCamera()
    }, [isCameraOpen])

    const uploadFile = async (file: File) => {
      if (!residentId) return
      setIsUploading(true)
      const formData = new FormData()
      formData.append("photo", file)
      formData.append("residentId", residentId)

      try {
        const res = await fetch(`/api/public/form/${token}/upload`, {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          setIsUploaded(true)
          setIsCameraOpen(false)
        } else {
          alert("Erro ao salvar foto.")
        }
      } catch {
        alert("Falha na conexão.")
      } finally {
        setIsUploading(false)
      }
    }

    const capturePhoto = () => {
      if (!videoRef.current || !residentId) return
      
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      ctx.drawImage(videoRef.current, 0, 0)
      
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
        await uploadFile(file)
      }, "image/jpeg", 0.9)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await uploadFile(file)
    }

    return (
      <>
        <input 
          type="file" 
          accept="image/*" 
          capture="user" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />

        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Capturar Foto Facial</DialogTitle>
              <DialogDescription>
                Alinhe seu rosto e clique em capturar.
              </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-[4/3] sm:aspect-[3/4] bg-black rounded-md overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <Button onClick={capturePhoto} size="lg" className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
                {isUploading ? "Enviando..." : "Capturar Foto"}
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                Fazer upload de arquivo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isUploaded ? (
          <Button variant="outline" size="sm" className="text-green-600 border-green-200 bg-green-50" onClick={() => setIsCameraOpen(true)}>
            <Check className="mr-2 h-4 w-4" /> Foto Salva (Trocar)
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsCameraOpen(true)} disabled={isUploading || !residentId}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />} 
            {isUploading ? "Enviando..." : "Tirar Foto"}
          </Button>
        )}
      </>
    )
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      // In a real app, terms would be loaded and accepted here.
      const termAccepts = [
        { termId: "dummy-term-id", acceptedByName: responsible.fullName }
      ]
      
      const res = await fetch(`/api/public/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          responsible,
          residents,
          vehicles,
          termAccepts,
          garageBoxes
        })
      })
      
      if (res.ok) {
        setIsFinished(true)
      } else {
        alert("Ocorreu um erro ao enviar.")
      }
    } catch (e) {
      alert("Falha na conexão.")
    } finally {
      setIsSaving(false)
    }
  }

  const addResident = () => setResidents([...residents, { fullName: "", cpf: "", rg: "", phone: "", phone2: "", email: "", relationshipToUnit: "Morador", tagQuantity: 0, remoteQuantity: 0, contactOrder: residents.length + 2 }])
  const removeResident = (index: number) => setResidents(residents.filter((_, i) => i !== index))
  const updateResident = (index: number, field: string, value: string | boolean | number) => {
    const newRes = [...residents]
    newRes[index] = { ...newRes[index], [field]: value }
    setResidents(newRes)
  }

  const addVehicle = () => setVehicles([...vehicles, { plate: "", vehicleType: "car", brand: "", model: "", color: "" }])
  const removeVehicle = (index: number) => setVehicles(vehicles.filter((_, i) => i !== index))
  const updateVehicle = (index: number, field: string, value: string) => {
    const newVeh = [...vehicles]
    newVeh[index] = { ...newVeh[index], [field]: value }
    setVehicles(newVeh)
  }

  const combined = [
    { type: 'responsible', name: responsible.fullName || 'Responsável', ref: responsible, index: -1 },
    ...residents.map((r, idx) => ({ type: 'dependent', name: r.fullName || `Dependente ${idx + 1}`, ref: r, index: idx }))
  ]

  const sortedCombined = [...combined].sort((a, b) => {
    const orderA = a.ref.contactOrder !== undefined ? a.ref.contactOrder : (a.type === 'responsible' ? 1 : a.index + 2)
    const orderB = b.ref.contactOrder !== undefined ? b.ref.contactOrder : (b.type === 'responsible' ? 1 : b.index + 2)
    return orderA - orderB
  })

  const moveContactOrder = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedCombined.length) return

    const list = [...sortedCombined]
    const temp = list[currentIndex]
    list[currentIndex] = list[targetIndex]
    list[targetIndex] = temp

    const newOrder = list.map((item, idx) => ({ ...item, newContactOrder: idx + 1 }))

    const respItem = newOrder.find(item => item.type === 'responsible')
    if (respItem) {
      setResponsible(prev => ({ ...prev, contactOrder: respItem.newContactOrder }))
    }

    const newResidents = [...residents]
    newOrder.forEach(item => {
      if (item.type === 'dependent' && item.index !== -1) {
        newResidents[item.index] = { ...newResidents[item.index], contactOrder: item.newContactOrder }
      }
    })
    setResidents(newResidents)
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Acesso Negado</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  if (isFinished) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <Card className="max-w-md w-full shadow-lg bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 dark:bg-green-900/30 dark:text-green-400">
            <Check className="h-6 w-6" />
          </div>
          <CardTitle>Cadastro Concluído</CardTitle>
          <CardDescription>Seus dados foram enviados com sucesso para a administração do {condoInfo?.name}.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  const steps = [
    { num: 1, title: "Responsável", icon: User },
    { num: 2, title: "Dependentes", icon: Users },
    { num: 3, title: "Veículos", icon: Car },
    { num: 4, title: "Fotos", icon: Camera },
    { num: 5, title: "Finalizar", icon: Check },
  ]

  return (
    <div className="min-h-screen bg-background dark p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex flex-col items-center space-y-4 mb-8">
          <img src="/logo.png" alt="Trontec" className="h-10" />
          <h1 className="text-xl font-medium text-center text-foreground">
            Recadastramento {condoInfo?.name}
          </h1>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center relative mb-8 overflow-x-auto pb-4">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border -z-10" />
          {steps.map(s => (
            <div key={s.num} className="flex flex-col items-center relative z-10 bg-background px-2">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.num ? "bg-primary border-primary text-primary-foreground" : "bg-card border-muted text-muted-foreground"}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-xs mt-2 font-medium hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>{steps[step-1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* Step 1: Responsável */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={responsible.fullName} onChange={e => setResponsible({...responsible, fullName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vínculo com o Apto *</Label>
                    <select
                      className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={responsible.relationshipToUnit}
                      onChange={e => setResponsible({...responsible, relationshipToUnit: e.target.value})}
                    >
                      <option value="Proprietário">Proprietário</option>
                      <option value="Locatário">Locatário</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Garagem Utilizada (Nº dos Boxes) *</Label>
                    <Input value={garageBoxes} onChange={e => setGarageBoxes(e.target.value)} placeholder="Ex: Box 12, Box 15" />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF *</Label>
                    <Input value={responsible.cpf} onChange={e => setResponsible({...responsible, cpf: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input value={responsible.rg} onChange={e => setResponsible({...responsible, rg: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone Celular (Principal) *</Label>
                    <Input value={responsible.phone} onChange={e => setResponsible({...responsible, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone Secundário</Label>
                    <Input value={responsible.phone2 || ''} onChange={e => setResponsible({...responsible, phone2: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input value={responsible.email} onChange={e => setResponsible({...responsible, email: e.target.value})} type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha (Acesso Físico - 6 dígitos) *</Label>
                    <Input type="password" maxLength={6} placeholder="Ex: 123456" value={responsible.password || ''} onChange={e => setResponsible({...responsible, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha *</Label>
                    <Input type="password" maxLength={6} placeholder="Repita a senha" value={responsible.passwordConfirm || ''} onChange={e => setResponsible({...responsible, passwordConfirm: e.target.value})} />
                    {responsible.passwordConfirm && responsible.password !== responsible.passwordConfirm && (
                      <p className="text-xs text-destructive mt-1">As senhas não coincidem.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Senha de Segurança *</Label>
                    <Input type="password" maxLength={20} value={responsible.securityPassword || ''} onChange={e => setResponsible({...responsible, securityPassword: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha Seg. *</Label>
                    <Input type="password" maxLength={20} value={responsible.securityPasswordConfirm || ''} onChange={e => setResponsible({...responsible, securityPasswordConfirm: e.target.value})} />
                    {responsible.securityPasswordConfirm && responsible.securityPassword !== responsible.securityPasswordConfirm && (
                      <p className="text-xs text-destructive mt-1">As senhas de segurança não coincidem.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de Tags de Acesso</Label>
                    <Input type="number" min="0" value={responsible.tagQuantity || 0} onChange={e => setResponsible({...responsible, tagQuantity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de Controles Remotos</Label>
                    <Input type="number" min="0" value={responsible.remoteQuantity || 0} onChange={e => setResponsible({...responsible, remoteQuantity: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Dependentes */}
            {step === 2 && (
              <div className="space-y-6">
                {residents.map((res, i) => (
                  <div key={i} className="p-4 border rounded-md relative space-y-4">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeResident(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <h3 className="font-medium">Dependente / Autorizado {i + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label>Nome Completo</Label>
                        <Input value={res.fullName} onChange={e => updateResident(i, 'fullName', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input value={res.cpf} onChange={e => updateResident(i, 'cpf', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Relação (Cônjuge, Filho, etc)</Label>
                        <Input value={res.relationshipToUnit} onChange={e => updateResident(i, 'relationshipToUnit', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone Celular (Principal)</Label>
                        <Input value={res.phone} onChange={e => updateResident(i, 'phone', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone Secundário</Label>
                        <Input value={res.phone2 || ''} onChange={e => updateResident(i, 'phone2', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha (Acesso Físico - 6 dígitos)</Label>
                        <Input type="password" maxLength={6} placeholder="Ex: 123456" value={res.password || ''} onChange={e => updateResident(i, 'password', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmar Senha</Label>
                        <Input type="password" maxLength={6} placeholder="Repita a senha" value={res.passwordConfirm || ''} onChange={e => updateResident(i, 'passwordConfirm', e.target.value)} />
                        {res.passwordConfirm && res.password !== res.passwordConfirm && (
                          <p className="text-xs text-destructive mt-1">As senhas não coincidem.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Senha de Segurança</Label>
                        <Input type="password" maxLength={20} value={res.securityPassword || ''} onChange={e => updateResident(i, 'securityPassword', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmar Senha Seg.</Label>
                        <Input type="password" maxLength={20} value={res.securityPasswordConfirm || ''} onChange={e => updateResident(i, 'securityPasswordConfirm', e.target.value)} />
                        {res.securityPasswordConfirm && res.securityPassword !== res.securityPasswordConfirm && (
                          <p className="text-xs text-destructive mt-1">As senhas de segurança não coincidem.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Quantidade de Tags de Acesso</Label>
                        <Input type="number" min="0" value={res.tagQuantity || 0} onChange={e => updateResident(i, 'tagQuantity', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantidade de Controles Remotos</Label>
                        <Input type="number" min="0" value={res.remoteQuantity || 0} onChange={e => updateResident(i, 'remoteQuantity', parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addResident} className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Dependente
                </Button>

                {/* Prioridade de ligação */}
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-medium mb-1">Prioridade de Ligação (Ordem de Contato)</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ordene a lista abaixo para definir em qual sequência a portaria deve ligar.</p>
                  <div className="space-y-2">
                    {sortedCombined.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                        <span className="text-sm font-medium">
                          {idx + 1}º - {item.name} {item.type === 'responsible' ? '(Responsável)' : ''}
                        </span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => moveContactOrder(idx, 'up')} disabled={idx === 0}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => moveContactOrder(idx, 'down')} disabled={idx === sortedCombined.length - 1}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Veículos */}
            {step === 3 && (
              <div className="space-y-6">
                {vehicles.map((veh, i) => (
                  <div key={i} className="p-4 border rounded-md relative space-y-4">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeVehicle(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <h3 className="font-medium">Veículo {i + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Placa</Label>
                        <Input value={veh.plate} onChange={e => updateVehicle(i, 'plate', e.target.value.toUpperCase())} />
                      </div>
                      <div className="space-y-2">
                        <Label>Marca / Modelo</Label>
                        <Input value={veh.brand} onChange={e => updateVehicle(i, 'brand', e.target.value)} placeholder="Ex: Honda Civic" />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <Input value={veh.color} onChange={e => updateVehicle(i, 'color', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addVehicle} className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Veículo
                </Button>
              </div>
            )}

            {/* Step 4: Fotos */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-md flex gap-3 text-sm">
                  <Info className="h-5 w-5 text-primary shrink-0" />
                  <p>As fotos são necessárias para o sistema de controle de acesso facial. Tire uma foto de frente, em fundo neutro, local iluminado, sem óculos escuros ou chapéu.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-md flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{responsible.fullName || "Responsável"}</h4>
                      <p className="text-xs text-muted-foreground">Responsável Principal</p>
                    </div>
                    <PhotoUploadButton residentId={responsible.id} token={token} />
                  </div>
                  
                  {residents.map((res, i) => (
                    <div key={i} className="p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{res.fullName || `Dependente ${i+1}`}</h4>
                        <p className="text-xs text-muted-foreground">{res.relationshipToUnit}</p>
                      </div>
                      <PhotoUploadButton residentId={res.id} token={token} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Termos */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 border rounded-md bg-muted/30">
                  <h3 className="font-medium mb-4">Termos e Condições</h3>
                  
                  {terms.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {terms.map((term, idx) => (
                        <div key={idx} className="border rounded-md bg-background overflow-hidden">
                          <div className="px-4 py-2 border-b bg-muted/50 font-semibold text-sm">
                            {term.title}
                          </div>
                          <div className="p-4 max-h-32 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap">
                            {term.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4 text-justify">
                      Declaro que as informações acima prestadas são verdadeiras e assumo inteira responsabilidade pelas mesmas.
                      Autorizo a utilização dos meus dados e da minha imagem para controle de acesso conforme Lei Geral de Proteção de Dados (LGPD).
                    </p>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer" 
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <Label htmlFor="terms" className="font-medium cursor-pointer select-none">
                      Li e concordo com os termos descritos acima
                    </Label>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={prevStep} disabled={step === 1 || isSaving}>
              Voltar
            </Button>
            
            {step < 5 ? (
              <Button onClick={nextStep} disabled={isSaving}>
                Avançar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSaving || !acceptedTerms}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Enviar Cadastro
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
