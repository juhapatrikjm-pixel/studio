"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  ShieldCheck, 
  Bluetooth, 
  User, 
  CalendarDays,
  Info,
  Refrigerator,
  Flame,
  Droplets,
  Truck,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Settings2,
  UtensilsCrossed,
  Save,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, isValid } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const CATEGORIES = [
  { id: 'Kylmälaitteet', icon: Refrigerator, color: 'text-blue-400' },
  { id: 'Kuumennus', icon: Flame, color: 'text-orange-400' },
  { id: 'Jäähdytys', icon: Clock, color: 'text-purple-400' },
  { id: 'Vastaanotto', icon: Truck, color: 'text-emerald-400' },
  { id: 'Puhdistus', icon: Droplets, color: 'text-sky-400' },
  { id: 'Astianpesu', icon: ShieldCheck, color: 'text-indigo-400' },
  { id: 'Buffet', icon: UtensilsCrossed, color: 'text-accent' },
];

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isMounted, setIsMounted] = useState(false)
  const [regulatoryUrl, setRegulatoryUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState<monitoringService.MonitoringTemplate[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  
  const [newTpl, setNewTpl] = useState({ name: '', category: 'Kylmälaitteet', limit: '' })

  const currentUserName = user?.displayName || user?.email || "Käyttäjä"
  const [currentDateDisplay, setCurrentDateDisplay] = useState("")

  const recordsQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(100))
  }, [firestore])
  
  const { data: recentRecords = [] } = useCollection<any>(recordsQuery)

  useEffect(() => {
    setIsMounted(true)
    setCurrentDateDisplay(format(new Date(), 'dd.MM.yyyy'))
    if (firestore) {
      monitoringService.getRegulatoryUrl(firestore).then(url => setRegulatoryUrl(url || ""))
      monitoringService.getMonitoringTemplates(firestore).then(setTemplates)
    }
  }, [firestore])

  const getLatestRecordForCat = (category: string) => {
    return recentRecords.find(r => r.category === category)
  }

  const handleSaveMeasurement = async (target: string, value: string, category: string) => {
    if (!firestore || !value) return
    setIsSaving(true)
    try {
      await monitoringService.saveMonitoringRecord(firestore, {
        targetName: target,
        value,
        recordedBy: currentUserName,
        method: 'manual',
        category
      })
      toast({ title: "Kirjaus tallennettu", description: `${target}: ${value}` })
    } catch (e) {
      toast({ variant: "destructive", title: "Virhe tallennuksessa" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTemplate = async () => {
    if (!firestore || !newTpl.name) return
    await monitoringService.addTemplate(firestore, {
      name: newTpl.name,
      category: newTpl.category,
      targetLimit: newTpl.limit,
      type: 'temperature'
    })
    const updated = await monitoringService.getMonitoringTemplates(firestore)
    setTemplates(updated)
    setNewTpl({ ...newTpl, name: '', limit: '' })
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!firestore) return
    await monitoringService.deleteTemplate(firestore, id)
    setTemplates(templates.filter(t => t.id !== id))
  }

  const handleArchiveDay = async () => {
    if (!firestore) return
    await monitoringService.archiveDay(currentDateDisplay, currentUserName)
    toast({ title: "Päivän seuranta arkistoitu", description: `Tallennettu arkistoon nimellä Tehtävä ${currentDateDisplay}` })
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <Card className="industrial-card overflow-hidden border-accent/20 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-inner">
              <User className="w-7 h-7 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] leading-none mb-1.5">Istunto / Kirjaaja</p>
              <p className="text-lg font-black text-foreground uppercase tracking-tight">{currentUserName}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] leading-none mb-1.5">Päivämäärä</p>
              <p className="text-lg font-black text-accent tracking-widest">{currentDateDisplay}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 shadow-lg">
              <CalendarDays className="w-7 h-7 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter copper-text-glow">Omavalvonta</h2>
          {regulatoryUrl && (
            <Button variant="ghost" size="icon" onClick={() => window.open(regulatoryUrl, '_blank')} className="text-blue-400 hover:bg-blue-400/10">
              <Info className="w-6 h-6" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)} className="border-white/10 text-accent font-black text-[10px] uppercase h-11 px-6 tracking-widest">
            <Settings2 className="w-4 h-4 mr-2" /> MUOKKAA KOHTEITA
          </Button>
          <Button onClick={handleArchiveDay} className="copper-gradient font-black text-[10px] uppercase h-11 px-6 tracking-widest metal-shine-overlay shadow-lg">
            <Save className="w-4 h-4 mr-2" /> ARKISTOI PÄIVÄ
          </Button>
        </div>
      </header>

      <MonitoringPulse />

      <Accordion type="single" collapsible className="w-full space-y-4">
        {CATEGORIES.map((cat) => {
          const catTemplates = templates.filter(t => t.category === cat.id);
          const Icon = cat.icon;
          const latest = getLatestRecordForCat(cat.id);
          
          let latestInfo = "Ei kirjauksia";
          if (latest) {
            try {
              const d = latest.date?.toDate ? latest.date.toDate() : new Date(latest.date);
              if (isValid(d)) {
                latestInfo = `${format(d, 'd.M.')} ${latest.recordedBy}`;
              }
            } catch (e) {
              console.error("Date format error", e);
            }
          }
          
          return (
            <AccordionItem key={cat.id} value={cat.id} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0 group hover:bg-white/[0.07] transition-all">
              <AccordionTrigger className="hover:no-underline px-6 py-5">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-5 text-left">
                    <div className={cn("w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-accent/40 transition-all shadow-inner", cat.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest text-foreground group-hover:text-accent transition-colors">{cat.id}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">
                        {latestInfo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {latest && <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in" />}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-8 pt-4 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
                  {catTemplates.map((tpl) => (
                    <div key={tpl.id} className="p-5 rounded-3xl bg-black/30 border border-white/5 space-y-4 relative shadow-inner">
                      <div className="flex justify-between items-start">
                        <Label className="text-[11px] font-black uppercase text-accent tracking-widest">{tpl.name}</Label>
                        <span className="text-[9px] font-black text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-full">{tpl.targetLimit}</span>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder={tpl.type === 'temperature' ? '°C' : 'Arvo...'} 
                          className="bg-black/40 border-white/10 font-black h-11 rounded-xl text-sm" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveMeasurement(tpl.name, (e.target as HTMLInputElement).value, cat.id);
                          }}
                        />
                        <Button 
                          size="icon" 
                          className="copper-gradient shrink-0 h-11 w-11 rounded-xl shadow-lg"
                          onClick={(e) => {
                            const input = (e.currentTarget.parentElement?.firstChild as HTMLInputElement);
                            handleSaveMeasurement(tpl.name, input.value, cat.id);
                          }}
                        >
                          <Save className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-accent/40 hover:text-accent h-11 w-11 rounded-xl"><Bluetooth className="w-5 h-5" /></Button>
                      </div>
                    </div>
                  ))}
                  {catTemplates.length === 0 && (
                    <div className="col-span-full py-16 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.3em]">Ei määritettyjä valvontapisteitä.</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-12 p-8 rounded-[2.5rem] bg-black/40 border border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 copper-gradient opacity-5 blur-3xl" />
        <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-3 tracking-[0.2em]">
          <Settings2 className="w-5 h-5 text-accent" /> VIRANOMAISOHJEET JA LINKIT
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Viranomaisohjeen URL (esim. Ruokavirasto.fi)" 
            value={regulatoryUrl}
            onChange={(e) => setRegulatoryUrl(e.target.value)}
            className="bg-black/20 border-white/10 text-xs h-12 rounded-xl"
          />
          <Button onClick={() => monitoringService.saveRegulatoryUrl(firestore!, regulatoryUrl)} variant="outline" className="border-white/10 text-accent uppercase text-[10px] font-black h-12 px-8 rounded-xl tracking-widest hover:bg-accent/10">TALLENNA LINKKI</Button>
        </div>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="p-8 border-b border-white/5 bg-black/20">
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-widest flex items-center gap-3">
              <Settings2 className="w-6 h-6" /> HALLITSE VALVONTAPISTEITÄ
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-8 space-y-5 border-b border-white/5 bg-white/[0.02]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">NIMI</Label>
                  <Input placeholder="Esim. Kylmiö 3" value={newTpl.name} onChange={e => setNewTpl({...newTpl, name: e.target.value})} className="bg-black/20 h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">KATEGORIA</Label>
                  <select 
                    value={newTpl.category} 
                    onChange={e => setNewTpl({...newTpl, category: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-md h-11 px-3 text-xs text-foreground outline-none focus:border-accent/40"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">OHJERAJA</Label>
                  <Input placeholder="Esim. max +6 °C" value={newTpl.limit} onChange={e => setNewTpl({...newTpl, limit: e.target.value})} className="bg-black/20 h-11" />
                </div>
              </div>
              <Button onClick={handleAddTemplate} className="w-full copper-gradient font-black text-[10px] uppercase h-12 rounded-xl tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> LISÄÄ UUSI KOHDE
              </Button>
            </div>
            <ScrollArea className="flex-1 p-8">
              <div className="grid grid-cols-1 gap-3">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-accent/20 transition-all shadow-sm">
                    <div>
                      <p className="text-xs font-black text-foreground uppercase tracking-tight">{t.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">{t.category} • {t.targetLimit}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t.id)} className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 border-t border-white/5 bg-black/20">
            <Button onClick={() => setIsManageOpen(false)} className="w-full font-black text-[10px] uppercase h-12 rounded-xl tracking-widest border-white/10">SULJE HALLINTA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
