"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Upload,
  FileText,
  Download,
  Plus,
  Settings2,
  Trash2,
  AlertTriangle,
  Clock,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useDoc, useStorage } from "@/firebase"
import { doc, collection, onSnapshot } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const storage = useStorage()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isMounted, setIsMounted] = useState(false)
  const [regulatoryUrl, setRegulatoryUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isBluetoothLoading, setIsBluetoothLoading] = useState(false)
  
  // Session info
  const currentUserName = user?.displayName || user?.email || "Kirjautunut käyttäjä"
  const currentDate = useMemo(() => format(new Date(), 'dd.MM.yyyy'), [])

  useEffect(() => {
    setIsMounted(true)
    if (firestore) {
      monitoringService.getRegulatoryUrl(firestore).then(setRegulatoryUrl)
    }
  }, [firestore])

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
        <div>
          <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
          <p className="text-muted-foreground font-medium italic">Aukoton seuranta ja Evira-yhteensopivuus.</p>
        </div>
        <div className="flex gap-2">
          {regulatoryUrl && (
            <Button 
              variant="outline" 
              onClick={() => window.open(regulatoryUrl, '_blank')}
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-black text-[10px] uppercase h-10 px-4"
            >
              <Info className="w-4 h-4 mr-2" /> Viranomaisohje
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={async () => {
              if (!firestore) return;
              setIsSaving(true);
              await monitoringService.saveMonitoringRecord(firestore, {
                targetName: "PAPERINEN OMAVALVONTA (KUITTAUS)",
                value: "SUORITETTU",
                recordedBy: currentUserName,
                method: 'paper_sync'
              });
              setIsSaving(false);
              toast({ title: "Hälytys kuitattu", description: "Paperinen seuranta merkitty tehdyksi." });
            }} 
            disabled={isSaving}
            className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-black text-[10px] uppercase h-10 px-4"
          >
            <ShieldCheck className="w-4 h-4 mr-2" /> Paperisen seurannan kuittaus
          </Button>
        </div>
      </header>

      <MonitoringPulse />

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* 1. KYLMÄLAITTEET */}
        <MonitoringSection 
          id="cold"
          title="Kylmälaitteet" 
          description="Kylmiöt (max +6 °C) ja Pakastimet (max -18 °C)"
          icon={<Refrigerator className="w-5 h-5" />}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Label className="text-xs font-black uppercase text-accent">Kylmiö 1</Label>
                <div className="flex gap-2">
                  <Input placeholder="°C" className="bg-black/40 border-white/10 font-bold" />
                  <Button size="icon" className="copper-gradient shrink-0"><ShieldCheck className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="text-accent/40"><Bluetooth className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Label className="text-xs font-black uppercase text-accent">Pakastin 1</Label>
                <div className="flex gap-2">
                  <Input placeholder="°C" className="bg-black/40 border-white/10 font-bold" />
                  <Button size="icon" className="copper-gradient shrink-0"><ShieldCheck className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="text-accent/40"><Bluetooth className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        </MonitoringSection>

        {/* 2. KUUMENNUS JA TARJOILU */}
        <MonitoringSection 
          id="heating"
          title="Kuumennus ja Tarjoilu" 
          description="Kuumennus (min +70 °C) ja Lämpimänäpito (min +60 °C)"
          icon={<Flame className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase">Tuote</Label>
                  <Input placeholder="Esim. Lounaskeitto" className="bg-black/40 h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase">Lämpötila (°C)</Label>
                  <Input placeholder="0.0" className="bg-black/40 h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase">Kello</Label>
                  <Input type="time" defaultValue="11:00" className="bg-black/40 h-10" />
                </div>
              </div>
              <Button className="w-full copper-gradient font-black text-xs uppercase h-12">TALLENNA MITTAUS</Button>
            </div>
          </div>
        </MonitoringSection>

        {/* 3. JÄÄHDYTYS */}
        <MonitoringSection 
          id="cooling"
          title="Jäähdytys" 
          description="Kriittinen seuranta: max 4h alkulämmöstä alle +6 °C"
          icon={<Clock className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 border-r border-white/5 pr-4">
                  <Label className="text-[10px] font-black uppercase text-accent">ALKULÄMPÖ</Label>
                  <div className="flex gap-2">
                    <Input placeholder="°C" className="bg-black/40 h-10" />
                    <Input type="time" className="bg-black/40 h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">LOPPULÄMPÖ</Label>
                  <div className="flex gap-2">
                    <Input placeholder="°C" className="bg-black/40 h-10" />
                    <Input type="time" className="bg-black/40 h-10" />
                  </div>
                </div>
              </div>
              <Button className="w-full steel-detail text-background font-black text-xs uppercase h-12">KUITTAA JÄÄHDYTYS</Button>
            </div>
          </div>
        </MonitoringSection>

        {/* 4. VASTAANOTTOTARKASTUS */}
        <MonitoringSection 
          id="receiving"
          title="Vastaanottotarkastus" 
          description="Saapuvan kuorman lämpötila ja kunto"
          icon={<Truck className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Toimittaja</Label><Input className="bg-black/40" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Lämpötila (°C)</Label><Input className="bg-black/40" /></div>
              </div>
              <div className="flex items-center gap-4 py-2 border-y border-white/5">
                <Label className="text-xs font-black uppercase flex-1">Kuorman kunto ja puhtaus OK?</Label>
                <Checkbox className="w-6 h-6 border-white/20" />
              </div>
              <Button className="w-full copper-gradient font-black text-xs uppercase h-12">KIRJAA VASTAANOTTO</Button>
            </div>
          </div>
        </MonitoringSection>

        {/* 5. PUHDISTUS JA HYGIENIA */}
        <MonitoringSection 
          id="cleaning"
          title="Puhdistus ja Hygienia" 
          description="Päivittäiset ja viikoittaiset puhdistusrutiinit"
          icon={<Droplets className="w-5 h-5" />}
        >
          <div className="space-y-3">
            {["Keittiön tasot", "Lattiakaivot", "Astianpesukoneen puhdistus", "Kylmiöiden pinnat"].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-accent/20 transition-all">
                <span className="text-sm font-bold uppercase tracking-tight">{task}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground font-black uppercase hidden group-hover:block">SUORITETTU</span>
                  <Checkbox className="w-6 h-6 border-white/20 data-[state=checked]:bg-green-500" />
                </div>
              </div>
            ))}
            <Button className="w-full mt-4 steel-detail text-background font-black text-xs uppercase h-12">KUITTAA PÄIVÄN SIIVOUS</Button>
          </div>
        </MonitoringSection>

        {/* 6. DOKUMENTTIARKISTO */}
        <MonitoringSection 
          id="archive"
          title="Dokumenttiarkisto (Lomakkeet)" 
          description="PDF-lomakkeet ja arkistoidut valvontatiedostot"
          icon={<Archive className="w-5 h-5" />}
        >
          <div className="space-y-6">
            <div className="flex gap-4 p-4 rounded-2xl bg-accent/5 border border-accent/20">
              <div className="flex-1">
                <p className="text-sm font-black text-accent uppercase mb-1">LATAA UUSI DOKUMENTTI</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">PDF, JPG tai PNG (Max 5MB)</p>
              </div>
              <Button variant="outline" className="border-accent/40 text-accent hover:bg-accent/10 h-12 px-6 font-black uppercase text-xs gap-2">
                <Upload className="w-4 h-4" /> VALITSE TIEDOSTO
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Tallennetut dokumentit</Label>
              <ScrollArea className="h-48 border border-white/5 rounded-xl bg-black/20 p-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight">Evira_lomake_1.pdf</p>
                        <p className="text-[9px] text-muted-foreground">15.3.2024 • 1.2 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-accent"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </MonitoringSection>
      </Accordion>
    </div>
  )
}

function MonitoringSection({ id, title, description, icon, children }: { id: string, title: string, description: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <AccordionItem value={id} className="industrial-card border-none bg-white/5 rounded-2xl overflow-hidden px-0">
      <AccordionTrigger className="hover:no-underline px-6 py-4 group">
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-accent/40 group-hover:text-accent transition-all">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground group-hover:text-accent transition-colors">{title}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight mt-0.5 opacity-60">{description}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6 pt-2 border-t border-white/5">
        <div className="animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
