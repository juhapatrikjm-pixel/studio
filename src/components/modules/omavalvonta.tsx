"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  ShieldCheck, User, CalendarDays, Info, Refrigerator, Flame, Clock, Plus, Trash2, 
  CheckCircle2, Settings2, Save, Loader2, Wrench, AlertTriangle, Droplets, UtensilsCrossed 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser } from "@/firebase"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInHours, parse } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isMounted, setIsMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeData, setActiveData] = useState<any[]>([])
  const [localValues, setLocalValues] = useState<Record<string, any>>({})

  const currentUserName = user?.displayName || user?.email || "Käyttäjä"
  const currentDateDisplay = isMounted ? format(new Date(), 'dd.MM.yyyy') : ""

  useEffect(() => {
    setIsMounted(true)
    if (firestore && user) {
      monitoringService.getActiveRecords(firestore, user.uid).then(records => {
        setActiveData(records)
        const initialValues: Record<string, any> = {}
        records.forEach((r: any) => {
          initialValues[`${r.category}_${r.targetName}`] = r
        })
        setLocalValues(initialValues)
      })
    }
  }, [firestore, user])

  const handleUpdate = async (category: string, targetName: string, field: string, value: any) => {
    if (!firestore || !user) return
    
    const key = `${category}_${targetName}`
    const current = localValues[key] || { category, targetName, recordedBy: currentUserName }
    const updated = { ...current, [field]: value }
    
    setLocalValues(prev => ({ ...prev, [key]: updated }))
    await monitoringService.saveActiveRecord(firestore, user.uid, updated)
  }

  const handleArchive = async () => {
    if (!firestore || !user) return
    setIsSaving(true)
    try {
      await monitoringService.archiveMonitoringDay(firestore, user.uid, currentUserName)
      setLocalValues({})
      setActiveData([])
      toast({ title: "Päivä arkistoitu onnistuneesti" })
    } catch (e) {
      toast({ variant: "destructive", title: "Arkistointi epäonnistui" })
    } finally {
      setIsSaving(false)
    }
  }

  const getVal = (cat: string, target: string, field: string) => {
    return localValues[`${cat}_${target}`]?.[field] || ""
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* SESSION HEADER - READ ONLY */}
      <Card className="industrial-card border-accent/20 bg-accent/5">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">KIRJAAJA (LUKITTU)</p>
              <p className="text-lg font-black text-foreground">{currentUserName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">PÄIVÄMÄÄRÄ</p>
              <p className="text-lg font-black text-accent">{currentDateDisplay}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center px-1">
        <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
        <Button onClick={handleArchive} disabled={isSaving} className="copper-gradient font-black text-[10px] uppercase h-11 px-8 tracking-widest">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} ARKISTOI PÄIVÄ
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* 1. KUUMENNUS */}
        <AccordionItem value="kuumennus" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">KUUMENNUS</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Tavoite: &gt; 70 °C (Broileri 78 °C)</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map(i => {
                const target = `Mittaus ${i}`;
                const temp = Number(getVal('Kuumennus', target, 'value'));
                const isTooLow = temp > 0 && temp < 70;
                return (
                  <div key={i} className={cn("p-4 rounded-2xl border transition-all", isTooLow ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5")}>
                    <div className="flex justify-between mb-2">
                      <Label className="text-[10px] font-black uppercase">{target}</Label>
                      {temp >= 70 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Input placeholder="Tuote" value={getVal('Kuumennus', target, 'type')} onChange={(e) => handleUpdate('Kuumennus', target, 'type', e.target.value)} className="h-9 text-xs" />
                      <Input type="number" placeholder="°C" value={getVal('Kuumennus', target, 'value')} onChange={(e) => handleUpdate('Kuumennus', target, 'value', e.target.value)} className={cn("h-9 font-black", isTooLow && "text-destructive border-destructive")} />
                    </div>
                    {isTooLow && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2">
                        <Label className="text-[9px] font-black text-destructive uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> TOIMENPIDE VAADITAAN</Label>
                        <Input placeholder="Miten virhe korjattiin? (Esim. Kuumennettu lisää)" value={getVal('Kuumennus', target, 'comment')} onChange={(e) => handleUpdate('Kuumennus', target, 'comment', e.target.value)} className="h-8 text-[10px] bg-black/40" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. JÄÄHDYTYS */}
        <AccordionItem value="jaahdytys" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">JÄÄHDYTYS</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Max 4h / Loppu &lt; 6 °C</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <div className="space-y-4">
              {[1, 2].map(i => {
                const target = `Jäähdytys ${i}`;
                const startT = getVal('Jäähdytys', target, 'startTime');
                const endT = getVal('Jäähdytys', target, 'endTime');
                const endTemp = Number(getVal('Jäähdytys', target, 'endTemp'));
                
                let timeDiff = 0;
                if (startT && endT) {
                  const s = parse(startT, 'HH:mm', new Date());
                  const e = parse(endT, 'HH:mm', new Date());
                  timeDiff = differenceInHours(e, s);
                }
                const isViolation = (timeDiff > 4) || (endTemp > 6);

                return (
                  <div key={i} className={cn("p-5 rounded-3xl border transition-all", isViolation ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5")}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">Tuote</Label>
                        <Input value={getVal('Jäähdytys', target, 'type')} onChange={(e) => handleUpdate('Jäähdytys', target, 'type', e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">Alku (Klo / °C)</Label>
                        <div className="flex gap-1">
                          <Input type="time" value={startT} onChange={(e) => handleUpdate('Jäähdytys', target, 'startTime', e.target.value)} className="h-9 w-24" />
                          <Input placeholder="°C" value={getVal('Jäähdytys', target, 'startTemp')} onChange={(e) => handleUpdate('Jäähdytys', target, 'startTemp', e.target.value)} className="h-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">Loppu (Klo / °C)</Label>
                        <div className="flex gap-1">
                          <Input type="time" value={endT} onChange={(e) => handleUpdate('Jäähdytys', target, 'endTime', e.target.value)} className="h-9 w-24" />
                          <Input placeholder="°C" value={getVal('Jäähdytys', target, 'endTemp')} onChange={(e) => handleUpdate('Jäähdytys', target, 'endTemp', e.target.value)} className="h-9" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center pb-2">
                        {startT && endT && !isViolation && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                      </div>
                    </div>
                    {isViolation && (
                      <div className="mt-4 space-y-1.5 border-t border-destructive/20 pt-3">
                        <Label className="text-[9px] font-black text-destructive uppercase">POIKKEAMA: AIKA TAI LÄMPÖTILA YLITETTY</Label>
                        <Input placeholder="Kirjaa selvitys poikkeamasta..." value={getVal('Jäähdytys', target, 'comment')} onChange={(e) => handleUpdate('Jäähdytys', target, 'comment', e.target.value)} className="h-9 bg-black/40" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. PUHDISTUS */}
        <AccordionItem value="puhdistus" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">PUHDISTUS</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Päivittäiset rutiinit</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['Työtasot', 'Lattiakaivot', 'Kylmälaitteet ulkoa', 'Uunit'].map(item => (
                <div key={item} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-accent/40 transition-all">
                  <div className="flex items-center gap-4">
                    <Checkbox checked={!!getVal('Puhdistus', item, 'status')} onCheckedChange={(val) => handleUpdate('Puhdistus', item, 'status', val)} className="w-6 h-6 border-white/20" />
                    <span className="text-sm font-bold uppercase tracking-tight">{item}</span>
                  </div>
                  <Input placeholder="Huom..." value={getVal('Puhdistus', item, 'comment')} onChange={(e) => handleUpdate('Puhdistus', item, 'comment', e.target.value)} className="h-8 w-32 bg-transparent border-none text-[10px]" />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. ASTIANPESU */}
        <AccordionItem value="astianpesu" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-500">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">ASTIANPESU</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Pesu & Huuhtelu</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <Card className="bg-black/20 border-white/5 p-6 rounded-3xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Pesuvesi (60-65 °C)</Label>
                  <Input type="number" placeholder="°C" value={getVal('Astianpesu', 'Kone 1', 'value')} onChange={(e) => handleUpdate('Astianpesu', 'Kone 1', 'value', e.target.value)} className="h-12 text-xl font-black" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Huuhteluvesi (&gt; 80 °C)</Label>
                  <Input type="number" placeholder="°C" value={getVal('Astianpesu', 'Kone 1', 'endTemp')} onChange={(e) => handleUpdate('Astianpesu', 'Kone 1', 'endTemp', e.target.value)} className="h-12 text-xl font-black" />
                </div>
              </div>
              <div className="flex gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!getVal('Astianpesu', 'Kone 1', 'chemicalsOk')} onCheckedChange={(val) => handleUpdate('Astianpesu', 'Kone 1', 'chemicalsOk', val)} />
                  <Label className="text-[10px] font-black uppercase cursor-pointer">Pesu- ja huuhteluaine OK</Label>
                </div>
              </div>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 5. BUFFET-SEURANTA */}
        <AccordionItem value="buffet" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 text-accent">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">BUFFET-SEURANTA</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Tupla-mittaus (0h / 2h)</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4">
            <div className="space-y-3">
              {[1, 2, 3].map(i => {
                const target = `Linjasto ${i}`;
                const dish = getVal('Buffet', target, 'dishName');
                const t1 = getVal('Buffet', target, 'temp1');
                const t2 = getVal('Buffet', target, 'temp2');
                const warning = dish && !t2;

                return (
                  <div key={i} className={cn("p-4 rounded-2xl border transition-all", warning ? "bg-destructive/5 border-destructive/20" : "bg-black/20 border-white/5")}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">Ruokalaji</Label>
                        <Input value={dish} onChange={(e) => handleUpdate('Buffet', target, 'dishName', e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">Esillepano</Label>
                        <Input type="time" value={getVal('Buffet', target, 'displayTime')} onChange={(e) => handleUpdate('Buffet', target, 'displayTime', e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-60">1. Mittaus (°C)</Label>
                        <Input placeholder="°C" value={t1} onChange={(e) => handleUpdate('Buffet', target, 'temp1', e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className={cn("text-[9px] font-black uppercase", warning ? "text-destructive" : "opacity-60")}>
                          2. Mittaus (2h kuluttua)
                        </Label>
                        <Input placeholder="°C" value={t2} onChange={(e) => handleUpdate('Buffet', target, 'temp2', e.target.value)} className={cn("h-9", warning && "border-destructive")} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* REGULATORY LINK */}
      <div className="mt-8 p-6 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Info className="w-6 h-6 text-accent" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Viranomaisohjeet ja säädökset</p>
        </div>
        <Button variant="outline" onClick={() => window.open('https://www.ruokavirasto.fi', '_blank')} className="border-white/10 text-accent uppercase text-[10px] font-black h-10 px-6">
          AVAA RUOKAVIRASTO.FI
        </Button>
      </div>
    </div>
  )
}
