
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { 
  ShieldCheck, User, CalendarDays, Info, Refrigerator, Flame, Clock, Plus, Trash2, 
  CheckCircle2, Save, Loader2, AlertTriangle, Droplets, UtensilsCrossed,
  Check, Bluetooth, Settings, X, Truck, Timer, Wrench, FileText, Download, Upload, Folder
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection } from "@/firebase"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, isValid, differenceInMinutes, parse } from "date-fns"
import { fi } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { collection, query, where, orderBy } from "firebase/firestore"

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isMounted, setIsMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localValues, setLocalValues] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<monitoringService.MonitoringTemplate[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  
  const [newTargetName, setNewTargetName] = useState("")
  const [newTargetCategory, setNewTargetCategory] = useState("Kylmälaitteet")
  const [newTargetType, setNewTargetType] = useState<any>("temperature")

  const currentUserName = user?.displayName || user?.email || "Käyttäjä"
  const [currentDateDisplay, setCurrentDateDisplay] = useState("")

  // Arkiston tiedostot
  const archiveFilesQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'cloudFiles'), where('folderId', '==', 'omavalvonta_arkisto'), orderBy('createdAt', 'desc'))
  }, [firestore])
  const { data: archiveFiles = [] } = useCollection<any>(archiveFilesQuery)

  const loadData = async () => {
    if (!firestore || !user) return
    const [records, temps] = await Promise.all([
      monitoringService.getActiveRecords(firestore, user.uid),
      monitoringService.getTemplates(firestore)
    ])
    
    setTemplates(temps)
    const initialValues: Record<string, any> = {}
    records.forEach((r: any) => {
      initialValues[`${r.category}_${r.targetName}`] = r
    })
    setLocalValues(initialValues)
  }

  useEffect(() => {
    setIsMounted(true)
    setCurrentDateDisplay(format(new Date(), 'dd.MM.yyyy'))
    if (firestore && user) {
      loadData()
    }
  }, [firestore, user])

  const handleUpdate = async (category: string, targetName: string, field: string, value: any) => {
    if (!firestore || !user) return
    
    const key = `${category}_${targetName}`
    const current = localValues[key] || { category, targetName, recordedBy: currentUserName, date: new Date() }
    const updated = { ...current, [field]: value, recordedBy: currentUserName, updatedAt: new Date() }
    
    setLocalValues(prev => ({ ...prev, [key]: updated }))
    // Vastaus varmistuskysymykseen 1: onChange/onBlur tallentaa datan Firestoreen tässä:
    await monitoringService.saveActiveRecord(firestore, user.uid, updated)
  }

  const handleArchive = async (isManual = false) => {
    if (!firestore || !user) return
    setIsSaving(true)
    try {
      await monitoringService.archiveMonitoringDay(firestore, user.uid, currentUserName, isManual)
      setLocalValues({})
      toast({ title: isManual ? "Manuaalinen kuittaus tallennettu" : "Päivä arkistoitu", description: "Kooste on siirretty arkistoon." })
      loadData()
    } catch (e) {
      toast({ variant: "destructive", title: "Arkistointi epäonnistui" })
    } finally {
      setIsSaving(false)
    }
  }

  // Vastaus varmistuskysymykseen 2: defaultValue haetaan tietokannasta tässä:
  const getVal = (cat: string, target: string, field: string) => {
    return localValues[`${cat}_${target}`]?.[field] || ""
  }

  const isDone = (cat: string, target: string) => {
    const record = localValues[`${cat}_${target}`]
    if (!record) return false
    return !!(record.value || record.status || record.time || record.productName)
  }

  const getHeaderInfo = (category: string) => {
    const catRecords = Object.values(localValues).filter(r => r.category === category && r.updatedAt)
    if (catRecords.length === 0) return null
    const latest = [...catRecords].sort((a, b) => {
      const da = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime()
      const db = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime()
      return db - da
    })[0]
    
    try {
      const dateObj = latest.updatedAt?.toDate ? latest.updatedAt.toDate() : new Date(latest.updatedAt)
      if (!isValid(dateObj)) return null
      return `${format(dateObj, 'd.M.')} ${latest.recordedBy || ''}`
    } catch (e) { return null }
  }

  if (!isMounted) return null

  const CATEGORIES = ["Kylmälaitteet", "Kuumennus", "Jäähdytys", "Vastaanotto", "Buffet", "Astianpesu", "Puhdistus", "Laitteet"]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <Card className="industrial-card border-accent/20 bg-accent/5">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">KIRJAAJA</p>
              <p className="text-lg font-black text-foreground uppercase">{currentUserName}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">PÄIVÄMÄÄRÄ</p>
              <p className="text-lg font-black text-accent">{currentDateDisplay}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="industrial-card border-white/10 bg-white/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Käytätkö paperista omavalvontaa?</span>
          </div>
          <Button 
            onClick={() => handleArchive(true)} 
            disabled={isSaving}
            variant="outline" 
            className="border-accent/40 text-accent font-black text-[10px] h-9 px-4 uppercase hover:bg-accent/10"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} KUITTAA PÄIVÄ TEHDYKSI MANUAALISESTI
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
        <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)} className="border-white/10 text-muted-foreground hover:text-accent font-black text-[10px] uppercase h-11 px-6">
            <Settings className="w-4 h-4 mr-2" /> MUOKKAA KOHTEITA
          </Button>
          <Button onClick={() => handleArchive(false)} disabled={isSaving} className="copper-gradient font-black text-[10px] uppercase h-11 px-8 tracking-widest shadow-lg">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} ARKISTOI DIGITAALINEN PÄIVÄ
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {CATEGORIES.map(cat => {
          const headerInfo = getHeaderInfo(cat)
          const catTemplates = templates.filter(t => t.category === cat)
          
          return (
            <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
              <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110",
                      headerInfo ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent"
                    )}>
                      {cat === "Kylmälaitteet" ? <Refrigerator className="w-5 h-5" /> : 
                       cat === "Kuumennus" ? <Flame className="w-5 h-5" /> :
                       cat === "Jäähdytys" ? <Timer className="w-5 h-5" /> :
                       cat === "Vastaanotto" ? <Truck className="w-5 h-5" /> :
                       cat === "Astianpesu" ? <Droplets className="w-5 h-5" /> :
                       cat === "Buffet" ? <UtensilsCrossed className="w-5 h-5" /> :
                       cat === "Laitteet" ? <Wrench className="w-5 h-5" /> :
                       <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3>
                      <p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">
                        {headerInfo || "Ei vielä kirjauksia"}
                      </p>
                    </div>
                  </div>
                  {headerInfo && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-8 pt-4">
                <div className="space-y-4">
                  {catTemplates.map(t => {
                    const done = isDone(cat, t.name)
                    const val = Number(getVal(cat, t.name, 'value'))
                    const val2 = Number(getVal(cat, t.name, 'value2'))
                    
                    let isAlert = false
                    if (t.category === 'Kuumennus') {
                      const limit = t.name.includes('Broileri') ? 78 : 70
                      if (val > 0 && val < limit) isAlert = true
                    }
                    if (t.category === 'Kylmälaitteet') {
                      if (val > 0 && val > (t.name.includes('Pakastin') ? -18 : 6)) isAlert = true
                    }
                    if (t.category === 'Jäähdytys' && val2 > 0) {
                      if (val2 > 6) isAlert = true
                      const startTime = getVal(cat, t.name, 'time')
                      const endTime = getVal(cat, t.name, 'time2')
                      if (startTime && endTime) {
                        try {
                          const s = parse(startTime, 'HH:mm', new Date())
                          const e = parse(endTime, 'HH:mm', new Date())
                          if (differenceInMinutes(e, s) > 240) isAlert = true
                        } catch (err) {}
                      }
                    }

                    return (
                      <div key={t.id} className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col gap-4 group",
                        isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5",
                        done && !isAlert && "border-green-500/30"
                      )}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border",
                              done ? "bg-green-500/20 border-green-500/40 text-green-500" : "bg-white/5 border-white/10 text-muted-foreground"
                            )}>
                              {done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 opacity-40" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase tracking-tight">{t.name}</p>
                              <p className="text-[9px] text-muted-foreground font-black uppercase">{t.targetLimit || 'Seurantaohje'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {t.type === 'checklist' || t.type === 'cleaning' ? (
                              <Checkbox 
                                checked={getVal(cat, t.name, 'status') === true}
                                onCheckedChange={(checked) => handleUpdate(cat, t.name, 'status', checked)}
                                className="w-10 h-10 border-white/20"
                              />
                            ) : t.type === 'oil_change' ? (
                              <div className="space-y-1">
                                <Label className="text-[8px] uppercase font-black text-muted-foreground">VAIHTOPÄIVÄ</Label>
                                <Input 
                                  type="date" 
                                  value={getVal(cat, t.name, 'time')}
                                  onChange={(e) => handleUpdate(cat, t.name, 'time', e.target.value)}
                                  className="h-10 bg-black/40 text-[10px] font-black"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                {(t.type === 'cooling' || t.type === 'temperature') && (
                                  <div className="space-y-1 w-full md:w-48">
                                    <Label className="text-[8px] uppercase font-black text-muted-foreground">TUOTTEEN NIMI / PISTE</Label>
                                    <Input 
                                      placeholder="Tuote..." 
                                      value={getVal(cat, t.name, 'productName')}
                                      onChange={(e) => handleUpdate(cat, t.name, 'productName', e.target.value)}
                                      className="h-10 bg-black/40 text-[10px] font-black"
                                    />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-[8px] uppercase font-black text-muted-foreground">
                                    {t.type === 'cooling' ? 'ALKU °C' : t.type === 'buffet' ? 'ESILLE' : 'MITATTU'}
                                  </Label>
                                  <Input 
                                    type="number" 
                                    placeholder="°C" 
                                    value={getVal(cat, t.name, 'value')}
                                    onChange={(e) => handleUpdate(cat, t.name, 'value', e.target.value)}
                                    className={cn("w-24 h-10 font-black text-center text-lg", isAlert && "text-destructive border-destructive")}
                                  />
                                </div>
                                {(t.type === 'cooling' || t.type === 'buffet') && (
                                  <div className="space-y-1">
                                    <Label className="text-[8px] uppercase font-black text-muted-foreground">
                                      {t.type === 'cooling' ? 'LOPPU °C' : '2H MITTAUS'}
                                    </Label>
                                    <Input 
                                      type="number" 
                                      placeholder="°C" 
                                      value={getVal(cat, t.name, 'value2')}
                                      onChange={(e) => handleUpdate(cat, t.name, 'value2', e.target.value)}
                                      className="w-24 h-10 font-black text-center text-lg bg-black/40"
                                    />
                                  </div>
                                )}
                                <Button variant="ghost" size="icon" className="h-10 w-10 mt-5 bg-white/5 border border-white/10 hover:text-accent">
                                  <Bluetooth className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                          <div className="flex gap-2">
                            <div className="space-y-1 flex-1">
                              <Label className="text-[8px] uppercase font-black text-muted-foreground">
                                {t.type === 'cooling' ? 'ALKU KLO' : 'KLO'}
                              </Label>
                              <Input 
                                type="time" 
                                value={getVal(cat, t.name, 'time')}
                                onChange={(e) => handleUpdate(cat, t.name, 'time', e.target.value)}
                                className="h-8 bg-black/40 text-[10px]"
                              />
                            </div>
                            {t.type === 'cooling' && (
                              <div className="space-y-1 flex-1">
                                <Label className="text-[8px] uppercase font-black text-muted-foreground">LOPPU KLO</Label>
                                <Input 
                                  type="time" 
                                  value={getVal(cat, t.name, 'time2')}
                                  onChange={(e) => handleUpdate(cat, t.name, 'time2', e.target.value)}
                                  className="h-8 bg-black/40 text-[10px]"
                                />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>
                              {isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}
                            </Label>
                            <Input 
                              placeholder="Kirjaa huomiot tähän..." 
                              value={getVal(cat, t.name, 'comment')}
                              onChange={(e) => handleUpdate(cat, t.name, 'comment', e.target.value)}
                              className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}

        <AccordionItem value="arkisto" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">DOKUMENTTIARKISTO</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase mt-0.5">Arkistoidut raportit ja tyhjät lomakkeet</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <Save className="w-4 h-4" /> ARKISTOIDUT RAPORTIT
                </h4>
                <div className="space-y-2">
                  {archiveFiles.map(f => (
                    <div key={f.id} className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold">{f.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><Download className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {archiveFiles.length === 0 && <p className="text-[10px] uppercase font-bold text-muted-foreground/40 italic p-4 text-center">Ei aiempia raportteja.</p>}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <Download className="w-4 h-4" /> TYHJÄT LOMAKKEET
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold">Omavalvontasuunnitelma_Pohja.pdf</span>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Button variant="outline" className="w-full border-dashed border-white/10 text-[9px] font-black uppercase h-10 gap-2">
                    <Upload className="w-3.5 h-3.5" /> LATAA UUSI TYHJÄ POHJA
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 p-6 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Info className="w-6 h-6 text-accent" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Viralliset ohjeet: Ruokavirasto / Evira</p>
        </div>
        <Button variant="outline" onClick={() => window.open('https://www.ruokavirasto.fi/teemat/elintarvikeala/oppaat/omavalvonta/', '_blank')} className="border-white/10 text-accent uppercase text-[10px] font-black h-10 px-6">
          AVAA VIRANOMAISOHJE
        </Button>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline text-accent text-xl uppercase tracking-widest">Muokkaa kohteita</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsManageOpen(false)}><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">KOHTEEN NIMI</Label>
                <Input value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="Esim. Kylmiö 3..." className="bg-black/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">KATEGORIA</Label>
                <select 
                  value={newTargetCategory} 
                  onChange={(e) => setNewTargetCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">TYYPPI</Label>
                <select 
                  value={newTargetType} 
                  onChange={(e) => setNewTargetType(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase"
                >
                  <option value="temperature">Lämpötila</option>
                  <option value="checklist">Kuittaus (Checkbox)</option>
                  <option value="cooling">Jäähdytys (Alku/Loppu)</option>
                  <option value="buffet">Buffet (Kaksivaiheinen)</option>
                  <option value="cleaning">Siivous/Puhdistus</option>
                  <option value="oil_change">Laitteet / Huolto</option>
                </select>
              </div>
              <Button onClick={async () => {
                if (!firestore || !newTargetName.trim()) return
                await monitoringService.addTemplate(firestore, {
                  name: newTargetName,
                  category: newTargetCategory,
                  type: newTargetType
                })
                setNewTargetName("")
                loadData()
              }} className="md:col-span-2 copper-gradient h-12 font-black uppercase text-xs">LISÄÄ UUSI KOHDE</Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-accent px-1">NYKYISET KOHTEET</h4>
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <p className="text-xs font-black uppercase">{t.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{t.category} • {t.type}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (!firestore) return
                    await monitoringService.deleteTemplate(firestore, t.id)
                    loadData()
                  }} className="text-destructive/40 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
