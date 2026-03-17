"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Thermometer, 
  Bluetooth, 
  Loader2, 
  CheckCircle, 
  Settings2, 
  User, 
  ChevronRight, 
  CookingPot, 
  Truck, 
  Refrigerator, 
  Droplets, 
  Flame, 
  Sparkles, 
  ClipboardCheck,
  CalendarDays,
  AlertTriangle,
  History,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useDoc, useCollection } from "@/firebase"
import { doc, collection, query, orderBy, limit, Timestamp } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, isValid } from "date-fns"
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
  const [comments, setComments] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isBluetoothLoading, setIsBluetoothLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const [newTemplate, setNewTemplate] = useState({ 
    name: "", 
    category: "Kylmäketju", 
    targetLimit: "", 
    type: "temperature" as any 
  })

  // Records query for header info
  const recordsQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(100))
  }, [firestore])
  const { data: recentRecords = [] } = useCollection<any>(recordsQuery)

  useEffect(() => {
    setIsMounted(true)
    if (firestore) loadTemplates()
  }, [firestore])

  const loadTemplates = async () => {
    if (!firestore) return
    setIsLoadingTemplates(true)
    try {
      const data = await monitoringService.getMonitoringTemplates(firestore)
      setTemplates(data || [])
    } catch (e) {
      console.error("Error loading templates", e)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleSaveMeasurement = async (template: monitoringService.MonitoringTemplate) => {
    const val = currentValues[template.id]
    if (!val || !firestore) return
    
    setIsSaving(true)
    try {
      await monitoringService.saveMonitoringRecord(firestore, {
        targetName: template.name,
        value: val,
        comment: comments[template.id] || "",
        recordedBy: currentUserName,
        method: 'manual'
      })
      toast({ title: "Kirjaus tallennettu", description: `${template.name}: ${val}` })
      setCurrentValues(prev => { const n = {...prev}; delete n[template.id]; return n })
      setComments(prev => { const n = {...prev}; delete n[template.id]; return n })
    } catch (e) {
      toast({ variant: "destructive", title: "Virhe tallennuksessa" })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePaperSync = async () => {
    if (!firestore) return
    setIsSaving(true)
    try {
      await monitoringService.saveMonitoringRecord(firestore, {
        targetName: "PAPERINEN OMAVALVONTA (KUITTAUS)",
        value: "SUORITETTU",
        recordedBy: currentUserName,
        method: 'paper_sync'
      })
      toast({ title: "Hälytys kuitattu", description: "Paperinen seuranta merkitty tehdyksi." })
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

  const getLatestForCategory = (category: string) => {
    if (!isMounted) return "---"
    try {
      const categoryTemplates = templates.filter(t => t.category === category).map(t => t.name)
      const latest = recentRecords.find(r => categoryTemplates.includes(r.targetName) || r.targetName === "PAPERINEN OMAVALVONTA (KUITTAUS)")
      
      if (!latest) return "Ei kirjauksia"
      
      let date: Date;
      if (latest.date instanceof Timestamp) date = latest.date.toDate();
      else if (latest.date?.seconds) date = new Date(latest.date.seconds * 1000);
      else date = new Date(latest.date);

      if (!isValid(date)) return "---"
      return `${format(date, 'd.M.')} ${latest.recordedBy || 'Tiimi'}`
    } catch (e) {
      return "---"
    }
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map(t => t.category))).filter(Boolean) as string[]
    return cats
  }, [templates])

  const getCategoryIcon = (cat: string) => {
    if (cat.includes("Kylmä")) return <Refrigerator className="w-5 h-5" />
    if (cat.includes("Valmistus")) return <CookingPot className="w-5 h-5" />
    if (cat.includes("Vastaanotto")) return <Truck className="w-5 h-5" />
    if (cat.includes("Hygienia")) return <Droplets className="w-5 h-5" />
    if (cat.includes("Siivous")) return <Sparkles className="w-5 h-5" />
    if (cat.includes("Laitteet")) return <Flame className="w-5 h-5" />
    return <ShieldCheck className="w-5 h-5" />
  }

  if (!isMounted) return (
    <div className="p-20 text-center opacity-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
      <span className="uppercase font-black tracking-widest text-[10px]">Ladataan valvontaa...</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
          <p className="text-muted-foreground font-medium italic">Aukoton seuranta ja Evira-yhteensopivuus.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handlePaperSync} 
            disabled={isSaving}
            className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-black text-[10px] uppercase h-10 px-4"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" /> PAPERISEN SEURANNAN KUITTAUS
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-10 w-10 text-muted-foreground hover:text-accent border border-white/5">
              <Settings2 className="w-5 h-5" />
            </Button>
          )}
        </div>
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
                <CardHeader className="bg-black/40 border-b border-white/5 p-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent border border-accent/20">
                      {getCategoryIcon(cat)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">{cat}</CardTitle>
                      <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Päivittäiset merkinnät</CardDescription>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-[10px] font-black uppercase text-accent tracking-tighter">
                      VIIMEISIN: {getLatestForCategory(cat)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates.filter(t => t.category === cat).map(template => (
                      <div key={template.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/20 transition-all group flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-foreground">{template.name}</span>
                            <span className="text-[9px] font-bold text-accent uppercase tracking-widest">{template.targetLimit}</span>
                          </div>
                          {template.type === 'temperature' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-accent/40 hover:text-accent"
                              onClick={() => handleBluetooth(template.id)}
                              disabled={isBluetoothLoading}
                            >
                              <Bluetooth className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            {template.type === 'date' ? (
                              <Input 
                                type="date"
                                value={currentValues[template.id] || ""}
                                onChange={(e) => setCurrentValues(prev => ({ ...prev, [template.id]: e.target.value }))}
                                className="bg-black/40 border-white/10 h-10 font-bold"
                              />
                            ) : template.type === 'text' ? (
                              <Input 
                                placeholder="Arvio (OK, hyvä, puutteita...)"
                                value={currentValues[template.id] || ""}
                                onChange={(e) => setCurrentValues(prev => ({ ...prev, [template.id]: e.target.value }))}
                                className="bg-black/40 border-white/10 h-10 font-bold"
                              />
                            ) : (
                              <Input 
                                placeholder={template.type === 'temperature' ? "°C" : "Tulos..."}
                                value={currentValues[template.id] || ""}
                                onChange={(e) => setCurrentValues(prev => ({ ...prev, [template.id]: e.target.value }))}
                                className="bg-black/40 border-white/10 h-10 text-sm font-bold"
                              />
                            )}
                            <Button 
                              size="icon" 
                              onClick={() => handleSaveMeasurement(template)} 
                              disabled={isSaving || !currentValues[template.id]}
                              className="copper-gradient shrink-0 h-10 w-10"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            </Button>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[8px] uppercase font-black text-muted-foreground opacity-60 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> HUOMIOT / POIKKEAMAT
                            </Label>
                            <Input 
                              placeholder="Lisätiedot poikkeamista..."
                              value={comments[template.id] || ""}
                              onChange={(e) => setComments(prev => ({ ...prev, [template.id]: e.target.value }))}
                              className="bg-black/20 border-white/5 h-8 text-[10px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card sticky top-24">
            <CardHeader className="p-4 border-b border-white/5 bg-black/20">
              <CardTitle className="text-xs font-black uppercase text-accent tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> ISTUNTO
              </CardTitle>
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
                  <span className="text-foreground">{isMounted ? format(new Date(), 'd.M.yyyy') : '---'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                  <span>AIKA</span>
                  <span className="text-foreground">{isMounted ? format(new Date(), 'HH:mm') : '---'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="p-4 border-b border-white/5 bg-black/20">
              <CardTitle className="text-xs font-black uppercase text-accent tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> OHJEET
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-[10px] text-blue-400 font-bold leading-relaxed uppercase">
                  Muista kirjata poikkeamat ja korjaavat toimenpiteet jokaisen epänormaalin mittauksen yhteydessä.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                  Lämpötilat on mitattava vähintään kerran päivässä. Pakastimet kerran viikossa tai päivittäin.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Hallitse mittauskohteita
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">LISÄÄ UUSI KOHDE</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Nimi</Label>
                  <Input value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Esim. Kylmiö 3" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Kategoria</Label>
                  <select 
                    value={newTemplate.category} 
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-md h-9 px-2 text-xs"
                  >
                    <option value="Kylmäketju">Kylmäketju</option>
                    <option value="Valmistus & Jäähdytys">Valmistus & Jäähdytys</option>
                    <option value="Tarjoilu & Buffet">Tarjoilu & Buffet</option>
                    <option value="Hygienia & Astianpesu">Hygienia & Astianpesu</option>
                    <option value="Siivous & Arviointi">Siivous & Arviointi</option>
                    <option value="Laitteet & Huolto">Laitteet & Huolto</option>
                    <option value="Vastaanotto">Vastaanotto</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Tavoiteraja</Label>
                  <Input value={newTemplate.targetLimit} onChange={(e) => setNewTemplate({...newTemplate, targetLimit: e.target.value})} placeholder="esim. max +6 °C" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Tyyppi</Label>
                  <select 
                    value={newTemplate.type} 
                    onChange={(e) => setNewTemplate({...newTemplate, type: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-md h-9 px-2 text-xs"
                  >
                    <option value="temperature">Lämpötila</option>
                    <option value="text">Teksti / Arvio</option>
                    <option value="date">Päivämäärä</option>
                    <option value="sensory">Aistinvarainen</option>
                  </select>
                </div>
                <div className="col-span-2 pt-2">
                  <Button onClick={async () => {
                    if (!newTemplate.name) return;
                    await monitoringService.addMonitoringTemplate(firestore!, newTemplate);
                    setNewTemplate({ name: "", category: "Kylmäketju", targetLimit: "", type: "temperature" });
                    loadTemplates();
                  }} className="w-full copper-gradient font-black text-[10px] uppercase h-10">
                    LISÄÄ JÄRJESTELMÄÄN
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">AKTIIVISET KOHTEET ({templates.length})</h4>
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
                    <Button variant="ghost" size="icon" onClick={async () => {
                      await monitoringService.deleteMonitoringTemplate(firestore!, t.id);
                      loadTemplates();
                    }} className="h-8 w-8 text-destructive/40 hover:text-destructive">
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
