"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ShieldCheck, 
  Thermometer, 
  Bluetooth, 
  Loader2, 
  User, 
  CalendarDays,
  Info,
  Refrigerator,
  Flame,
  Droplets,
  Truck,
  Archive,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  CheckCircle2,
  Settings2,
  UtensilsCrossed,
  Save
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, where } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
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
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(new Set())
  const [isManageOpen, setIsManageOpen] = useState(false)
  
  // New template form
  const [newTpl, setNewTpl] = useState({ name: '', category: 'Kylmälaitteet', limit: '' })

  const currentUserName = user?.displayName || user?.email || "Käyttäjä"
  const currentDate = useMemo(() => format(new Date(), 'dd.MM.yyyy'), [])

  const recordsQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(50))
  }, [firestore])
  
  const { data: recentRecords = [] } = useCollection<any>(recordsQuery)

  useEffect(() => {
    setIsMounted(true)
    if (firestore) {
      monitoringService.getRegulatoryUrl(firestore).then(url => setRegulatoryUrl(url || ""))
      monitoringService.getMonitoringTemplates(firestore).then(setTemplates)
    }
  }, [firestore])

  useEffect(() => {
    const today = new Date().toDateString()
    const done = new Set<string>()
    recentRecords.forEach(r => {
      const rDate = r.date?.toDate ? r.date.toDate().toDateString() : new Date(r.date).toDateString()
      if (rDate === today) done.add(r.targetName)
    })
    setCompletedTargets(done)
  }, [recentRecords])

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
    await monitoringService.archiveDay(firestore, currentDate, currentUserName)
    toast({ title: "Päivän seuranta arkistoitu", description: `Tallennettu arkistoon nimellä Tehtävä ${currentDate}` })
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* SESSION HEADER */}
      <Card className="industrial-card overflow-hidden border-accent/20">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Kirjaaja (Read-only)</p>
              <p className="text-sm font-black text-foreground uppercase">{currentUserName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Päivämäärä</p>
              <p className="text-sm font-black text-accent">{currentDate}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
          {regulatoryUrl && (
            <Button variant="ghost" size="icon" onClick={() => window.open(regulatoryUrl, '_blank')} className="text-blue-400">
              <Info className="w-6 h-6" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)} className="border-white/10 text-accent font-black text-[10px] uppercase h-10 px-4">
            <Settings2 className="w-4 h-4 mr-2" /> Muokkaa kohteita
          </Button>
          <Button onClick={handleArchiveDay} className="copper-gradient font-black text-[10px] uppercase h-10 px-4">
            <Save className="w-4 h-4 mr-2" /> Arkistoi päivä
          </Button>
        </div>
      </header>

      <MonitoringPulse />

      <Accordion type="single" collapsible className="w-full space-y-4">
        {CATEGORIES.map((cat) => {
          const catTemplates = templates.filter(t => t.category === cat.id);
          const Icon = cat.icon;
          
          return (
            <AccordionItem key={cat.id} value={cat.id} className="industrial-card border-none bg-white/5 rounded-2xl overflow-hidden px-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 group">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className={cn("w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-accent/40 transition-all", cat.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-foreground group-hover:text-accent transition-colors">{cat.id}</h3>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight mt-0.5 opacity-60">Valvontapisteet: {catTemplates.length} kpl</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {catTemplates.every(t => completedTargets.has(t.name)) && catTemplates.length > 0 && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {catTemplates.map((tpl) => (
                    <div key={tpl.id} className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3 relative">
                      {completedTargets.has(tpl.name) && (
                        <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                      )}
                      <div className="flex justify-between items-start">
                        <Label className="text-[10px] font-black uppercase text-accent">{tpl.name}</Label>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{tpl.targetLimit}</span>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder={tpl.type === 'temperature' ? '°C' : 'Arvo...'} 
                          className="bg-black/40 border-white/10 font-bold h-10" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveMeasurement(tpl.name, (e.target as HTMLInputElement).value, cat.id);
                          }}
                        />
                        <Button 
                          size="icon" 
                          className="copper-gradient shrink-0"
                          onClick={(e) => {
                            const input = (e.currentTarget.parentElement?.firstChild as HTMLInputElement);
                            handleSaveMeasurement(tpl.name, input.value, cat.id);
                          }}
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-accent/40"><Bluetooth className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {catTemplates.length === 0 && (
                    <div className="col-span-full py-10 text-center opacity-20 text-[10px] font-black uppercase">Ei määritettyjä kohteita tässä kategoriassa.</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-10 p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
        <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Ohjeet ja linkit
        </h3>
        <div className="flex gap-4">
          <Input 
            placeholder="Viranomaisohjeen URL (esim. Evira.fi)" 
            value={regulatoryUrl}
            onChange={(e) => setRegulatoryUrl(e.target.value)}
            className="bg-black/20 border-white/10 text-xs"
          />
          <Button onClick={() => monitoringService.saveRegulatoryUrl(firestore!, regulatoryUrl)} variant="outline" className="border-white/10 text-accent uppercase text-[10px] font-black">Tallenna linkki</Button>
        </div>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <DialogTitle className="font-headline text-accent uppercase tracking-widest">Hallitse mittauskohteita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-6 space-y-4 border-b border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Kohteen nimi" value={newTpl.name} onChange={e => setNewTpl({...newTpl, name: e.target.value})} className="bg-black/20" />
                <select 
                  value={newTpl.category} 
                  onChange={e => setNewTpl({...newTpl, category: e.target.value})}
                  className="bg-black/20 border border-white/10 rounded-md px-3 text-xs text-foreground outline-none"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
                <Input placeholder="Raja-arvo (esim. +6)" value={newTpl.limit} onChange={e => setNewTpl({...newTpl, limit: e.target.value})} className="bg-black/20" />
              </div>
              <Button onClick={handleAddTemplate} className="w-full copper-gradient font-black text-[10px] uppercase">Lisää uusi kohde</Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                    <div>
                      <p className="text-xs font-black text-foreground uppercase">{t.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{t.category} • {t.targetLimit}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t.id)} className="text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-4 border-t border-white/5">
            <Button onClick={() => setIsManageOpen(false)} className="w-full font-black text-[10px] uppercase">Valmis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
