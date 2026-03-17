"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Plus, Trash2, Thermometer, Bluetooth, Loader2, CheckCircle, Settings2, User, ChevronRight, CookingPot, Truck, Refrigerator } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)
  const currentUserName = profile?.userName || user?.displayName || "Käyttäjä"
  const isAdmin = profile?.role === 'admin'

  const [templates, setTemplates] = useState<monitoringService.MonitoringTemplate[]>([])
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isBluetoothLoading, setIsBluetoothLoading] = useState(false)

  // Uuden kohteen lisäys (Admin)
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "Muut", targetLimit: "", type: "temperature" as any })

  useEffect(() => {
    if (firestore) {
      loadTemplates()
    }
  }, [firestore])

  const loadTemplates = async () => {
    if (!firestore) return
    setIsLoadingTemplates(true)
    const data = await monitoringService.getMonitoringTemplates(firestore)
    setTemplates(data)
    setIsLoadingTemplates(false)
  }

  const handleSaveMeasurement = async (template: monitoringService.MonitoringTemplate) => {
    const val = currentValues[template.id]
    if (!val || !firestore) return
    
    setIsSaving(true)
    try {
      await monitoringService.saveMonitoringRecord(firestore, {
        targetName: template.name,
        value: val,
        recordedBy: currentUserName,
        method: 'manual'
      })
      toast({ title: "Mittaustulos tallennettu", description: `${template.name}: ${val}` })
      setCurrentValues(prev => {
        const next = { ...prev }
        delete next[template.id]
        return next
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Virhe tallennuksessa" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBluetooth = async (templateId: string) => {
    setIsBluetoothLoading(true)
    try {
      const val = await monitoringService.handleBluetoothMeasurement() as string
      setCurrentValues(prev => ({ ...prev, [templateId]: val }))
      toast({ title: "Bluetooth-mittaus valmis", description: `Saatu arvo: ${val}°C` })
    } finally {
      setIsBluetoothLoading(false)
    }
  }

  const handleChefAudit = async () => {
    if (!firestore || !user) return
    try {
      await monitoringService.acknowledgeMonitoring(firestore, user.uid, currentUserName)
      toast({ title: "Auditointi tallennettu", description: "Jakson tiedot merkitty tarkistetuiksi." })
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddTemplate = async () => {
    if (!firestore || !newTemplate.name) return
    await monitoringService.addMonitoringTemplate(firestore, newTemplate)
    setNewTemplate({ name: "", category: "Muut", targetLimit: "", type: "temperature" })
    loadTemplates()
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!firestore) return
    await monitoringService.deleteMonitoringTemplate(firestore, id)
    loadTemplates()
  }

  const categories = Array.from(new Set(templates.map(t => t.category)))

  const getCategoryIcon = (cat: string) => {
    if (cat.includes("Kylmä")) return <Refrigerator className="w-5 h-5" />
    if (cat.includes("Valmistus") || cat.includes("Tarjoilu")) return <CookingPot className="w-5 h-5" />
    if (cat.includes("Vastaanotto")) return <Truck className="w-5 h-5" />
    return <ShieldCheck className="w-5 h-5" />
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
          <p className="text-muted-foreground font-medium italic">Viranomaisvaatimusten mukainen seuranta.</p>
        </div>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-10 w-10 text-muted-foreground hover:text-accent border border-white/5">
            <Settings2 className="w-5 h-5" />
          </Button>
        )}
      </header>

      <MonitoringPulse />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {isLoadingTemplates ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ladataan valvontakohteita...</span>
            </div>
          ) : (
            categories.map(cat => (
              <Card key={cat} className="industrial-card overflow-hidden">
                <CardHeader className="bg-black/40 border-b border-white/5 p-4 flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent border border-accent/20">
                    {getCategoryIcon(cat)}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">{cat}</CardTitle>
                    <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Päivittäinen valvonta</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.filter(t => t.category === cat).map(template => (
                      <div key={template.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/20 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-foreground">{template.name}</span>
                            <span className="text-[9px] font-bold text-accent uppercase tracking-widest">{template.targetLimit}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-accent/40 hover:text-accent"
                            onClick={() => handleBluetooth(template.id)}
                            disabled={isBluetoothLoading}
                          >
                            <Bluetooth className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            placeholder={template.type === 'temperature' ? "°C" : "Tulos..."}
                            value={currentValues[template.id] || ""}
                            onChange={(e) => setCurrentValues(prev => ({ ...prev, [template.id]: e.target.value }))}
                            className="bg-black/40 border-white/10 h-9 text-sm font-bold"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveMeasurement(template)} 
                            disabled={isSaving || !currentValues[template.id]}
                            className="copper-gradient px-4 h-9"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Keittiömestarin auditointi */}
          <Card className="industrial-card border-accent/20 bg-accent/5">
            <CardHeader className="p-4">
              <CardTitle className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Keittiömestarin auditointi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed max-w-md">
                Auditoimalla vahvistat, että kuluneen jakson omavalvontakirjaukset on tehty ja korjaavat toimenpiteet on suoritettu mahdollisten poikkeamien kohdalla.
              </p>
              <Button 
                onClick={handleChefAudit}
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/10 font-black text-[10px] uppercase h-10 px-6 shrink-0"
              >
                KUITATTU TARKISTETUKSI
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="industrial-card sticky top-24">
            <CardHeader className="p-4 border-b border-white/5 bg-black/20">
              <CardTitle className="text-xs font-black uppercase text-accent tracking-widest">KIRJAAJA</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <User className="w-10 h-10 text-accent" />
              </div>
              <div>
                <p className="text-lg font-black uppercase text-foreground">{currentUserName}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isAdmin ? 'ADMIN / MESTARI' : 'TIIMIN JÄSEN'}</p>
              </div>
              <div className="w-full pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                  <span>PVM</span>
                  <span className="text-foreground">{format(new Date(), 'd.M.yyyy')}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                  <span>AIKA</span>
                  <span className="text-foreground">{format(new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Muokkaa mittauskohteita
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">LISÄÄ UUSI KOHDE</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Nimi</Label>
                  <Input value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Kategoria</Label>
                  <Input value={newTemplate.category} onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Tavoiteraja</Label>
                  <Input value={newTemplate.targetLimit} onChange={(e) => setNewTemplate({...newTemplate, targetLimit: e.target.value})} placeholder="esim. max +6 °C" className="h-9 text-xs" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTemplate} className="w-full copper-gradient font-black text-[10px] uppercase h-9">LISÄÄ LISTAAN</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">NYKYISET KOHTEET ({templates.length})</h4>
              <div className="grid grid-cols-1 gap-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase">{t.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{t.category} • {t.targetLimit}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t.id)} className="h-8 w-8 text-destructive/40 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
