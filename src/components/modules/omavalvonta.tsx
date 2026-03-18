
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
  Check, Bluetooth, Settings, X, Truck, Timer, Wrench, FileText, Download, Upload, Folder, Beef, Salad, Sparkles, ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection, useDoc } from "@/firebase"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, isValid, differenceInMinutes, parse } from "date-fns"
import { fi } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { collection, query, where, orderBy, doc } from "firebase/firestore"

interface DynamicEntry { id: number; type?: string; }

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

  const [coolingEntries, setCoolingEntries] = useState<DynamicEntry[]>([{id: Date.now()}]);
  const [heatingEntries, setHeatingEntries] = useState<DynamicEntry[]>([{ id: Date.now() + 1, type: 'new' }, { id: Date.now() + 2, type: 'reheat' }]);
  const [buffetEntries, setBuffetEntries] = useState<DynamicEntry[]>([{ id: Date.now() + 3, type: 'hot' }, { id: Date.now() + 4, type: 'cold' }]);
  const [vastaanottoEntries, setVastaanottoEntries] = useState<DynamicEntry[]>([{id: Date.now() + 5}]);

  const addEntry = (setter: React.Dispatch<React.SetStateAction<any[]>>, type?: string) => {
    const newEntry: any = { id: Date.now() };
    if (type) newEntry.type = type;
    setter(prev => [...prev, newEntry]);
  };

  const removeEntry = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: number) => {
    setter(prev => prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev);
  };

  const currentUserName = user?.displayName || user?.email || "Käyttäjä"
  const [currentDateDisplay, setCurrentDateDisplay] = useState("")

  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const { data: settings } = useDoc<any>(settingsRef)

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

  const getVal = (cat: string, target: string, field: string) => {
    return localValues[`${cat}_${target}`]?.[field] || ""
  }

  const isDone = (cat: string, target: string) => {
    const record = localValues[`${cat}_${target}`];
    if (!record) return false;

    switch (cat) {
      case 'Vastaanotto':
        return !!(record.supplier && record.productName && record.value);
      case 'Jäähdytys':
        return !!(record.productName && record.time && record.value && record.time2 && record.value2);
      case 'Kuumennus':
        return !!(record.productName && record.value);
      case 'Buffet':
        return !!(record.productName && record.value && record.value2 && record.time);
      case 'Astianpesu':
        return !!(record.value && record.value2);
      default: // Handles templates: Kylmälaitteet, Puhdistus, Laitteet etc.
        return !!(record.value || record.status === true || record.time);
    }
  }

  const { totalTasks, completedTasks, progress } = useMemo(() => {
    let total = 0;
    let completed = 0;

    total += templates.length;
    templates.forEach(t => { if (isDone(t.category, t.name)) completed++; });

    total += coolingEntries.length;
    coolingEntries.forEach(e => { if (isDone('Jäähdytys', `Jäähdytys-${e.id}`)) completed++; });

    total += heatingEntries.length;
    heatingEntries.forEach(e => { if (isDone('Kuumennus', `${e.type === 'new' ? 'Valmistus' : 'Uudelleenkuumennus'}-${e.id}`)) completed++; });

    total += buffetEntries.length;
    buffetEntries.forEach(e => { if (isDone('Buffet', `Buffet-${e.type}-${e.id}`)) completed++; });
    
    total += vastaanottoEntries.length;
    vastaanottoEntries.forEach(e => { if (isDone('Vastaanotto', `Vastaanotto-${e.id}`)) completed++; });

    const staticTasks = ['Astianpesu'];
    total += staticTasks.length;
    if (isDone('Astianpesu', 'astianpesukone')) completed++;
    
    return { 
      totalTasks: total,
      completedTasks: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [templates, localValues, coolingEntries, heatingEntries, buffetEntries, vastaanottoEntries]);


  const getHeaderInfo = (category: string) => {
    const catRecords = Object.values(localValues).filter(r => r.category === category && r.updatedAt)
    if (catRecords.length === 0) return `Ei kirjauksia`
    
    const latest = [...catRecords].sort((a, b) => {
      const da = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime();
      const db = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime();
      return db - da
    })[0]
    
    try {
      const dateObj = latest.updatedAt?.toDate ? latest.updatedAt.toDate() : new Date(latest.updatedAt)
      if (!isValid(dateObj)) return `...`
      return `Viimeisin: ${format(dateObj, 'HH:mm')} (${latest.recordedBy?.split(' ')[0] || ''})`
    } catch (e) { return `...` }
  }
  
  const cheers = useMemo(() => [
      "Kokki on keittiön kuningas! 👑", "Tänään on loistava päivä tehdä taikuutta lautasella! ✨",
      "Pidetään veitset terävinä ja mieli kirkkaana! 🔪", "Keittiössä ei hikoilla, siellä loistetaan! 💪",
      "Mise en place on puoli voittoa! 🔥", "Tänään jokainen annos on mestariteos! 🎨",
      "Parasta ruokaa, parhaalla asenteella! 🥘", "Keittiötiimi on perhe! ❤️",
      "Hymyile, asiakkaat maistavat rakkauden ruoassa! 😊", "Tänään vedetään täysillä, kuten aina! 🚀",
      "Älä stressaa, tee parhaasi! ✨", "Kaikki kontrollissa, tilauslappuja tulee! 📝",
      "Muista juoda vettä, kokki! 🥤", "Keittiö on elämäntapa! 🤘",
      "Tänään on hyvä päivä loistaa! 🌟", "Nyt mennään eikä meinata! 🔥",
      "Puhdas keittiö, puhdas mieli! 🧼", "Tiimityö on keittiön suola! 🧂",
      "Olet rautainen ammattilainen! ⚒️", "Tsemppiä vuoroon, sä hoidat tän! 🤜🤛",
      "Keittiöhuumori on parasta huumoria! 😂", "Liesi kuumana, sydän lämpimänä! ❤️",
      "Tänään yllätetään itsemme! 🌈", "Kiire on vain asennekysymys! ⏱️",
      "Jokainen lautanen on käyntikorttisi! 🎫", "Pidetään maku kohdillaan! 👅",
      "Ruoanlaitto on intohimo! 🍷", "Olet keittiön sankari! 🦸",
      "Tänään ei paleta mikään pohjaan! 🍳", "Kaikki rullaa kuin rasvattu! 🧈",
      "Keittiö on teatteri, sinä olet tähti! 🎭", "Olet tehokas kuin Rational! 🌪️",
      "Positiivisuus on tarttuvaa! 🦠 (hyvällä tavalla)", "Tänään luodaan muistoja! 📸",
      "Kupari kiiltää ja pataan porisee! ✨", "Anna mennä, kokki! ⚡",
      "Olet korvaamaton osa tätä tiimiä! 🧩", "Tämä vuoro on sun! 🏆",
      "Luo jotain uutta tänään! 💡", "Keittiö elää ja hengittää kanssasi! 🌬️"
  ], []);

  const [cheer, setCheer] = useState("")

  useEffect(() => {
    setCheer(cheers[Math.floor(Math.random() * cheers.length)])
  }, [cheers])

  if (!isMounted) return null

  const CATEGORIES = ["Kylmälaitteet", "Vastaanotto", "Kuumennus", "Jäähdytys", "Buffet", "Astianpesu", "Puhdistus", "Laitteet"]
  const TEMPLATE_CATEGORIES = ["Kylmälaitteet", "Puhdistus", "Laitteet"];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <Card className="industrial-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-black uppercase tracking-widest text-accent">Päivän edistyminen</p>
            <p className="text-sm font-black uppercase text-foreground">{completedTasks} / {totalTasks} TEHTY</p>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 border border-white/5">
            <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
           <p className="text-center text-xs text-muted-foreground font-medium pt-1">"{cheer}"</p>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-accent" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">KIRJAAJA</span>
                <span className="text-xs font-black uppercase text-accent tracking-tight">{currentUserName}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-accent" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">PÄIVÄMÄÄRÄ</span>
                <span className="text-xs font-black uppercase text-accent tracking-tight">{currentDateDisplay}</span>
              </div>
            </div>
          </div>
          {settings?.viranomaisohjeUrl && (
            <a 
              href={settings.viranomaisohjeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-accent/10 text-accent transition-colors"
              title="Viranomaisohje"
            >
              <Info className="w-5 h-5" />
            </a>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
        <h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageOpen(true)} className="border-white/10 text-muted-foreground hover:text-accent font-black text-[10px] uppercase h-11 px-6">
            <Settings className="w-4 h-4 mr-2" /> Muokkaa kohteita
          </Button>
          <Button variant="outline" onClick={() => handleArchive(true)} disabled={isSaving} className="border-accent/40 text-accent font-black text-[10px] uppercase h-11 px-6">
            KUITTAA PÄIVÄ MANUAALISESTI
          </Button>
          <Button onClick={() => handleArchive(false)} disabled={isSaving} className="copper-gradient font-black text-[10px] uppercase h-11 px-8 tracking-widest shadow-lg">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Arkistoi & Kuittaa
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={CATEGORIES}>
        {CATEGORIES.map(cat => {
          const headerInfo = getHeaderInfo(cat);

          if (cat === 'Vastaanotto') {
            const isCategoryDone = vastaanottoEntries.length > 0 && vastaanottoEntries.every(entry => isDone(cat, `Vastaanotto-${entry.id}`));
            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><Truck className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="space-y-3">
                  {vastaanottoEntries.map((entry) => {
                      const targetName = `Vastaanotto-${entry.id}`;
                      const done = isDone(cat, targetName);
                      return (
                        <div key={entry.id} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", "bg-black/20 border-white/5", done && "border-green-500/30")}>
                           <Button variant="ghost" size="icon" onClick={() => removeEntry(setVastaanottoEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
                           <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">TOIMITTAJA</Label><Input placeholder='Esim. Meiranova' value={getVal(cat, targetName, 'supplier')} onChange={(e) => handleUpdate(cat, targetName, 'supplier', e.target.value)} className="h-9 bg-black/40 text-xs font-bold uppercase"/></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">TUOTE</Label><Input placeholder='Esim. Kurkku' value={getVal(cat, targetName, 'productName')} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-9 bg-black/40 text-xs font-bold uppercase"/></div>
                           </div>
                           <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">LÄMPÖTILA</Label><Input type="number" placeholder="°C" value={getVal(cat, targetName, 'value')} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center")}/></div>
                        </div>
                      )
                  })}
                  <Button onClick={() => addEntry(setVastaanottoEntries)} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää toimitus</Button>
                </div></AccordionContent>
              </AccordionItem>
            )
          }

          if (cat === 'Astianpesu') {
            const targetName = 'astianpesukone';
            const washTemp = getVal(cat, targetName, 'value');
            const rinseTemp = getVal(cat, targetName, 'value2');
            const done = isDone(cat, targetName);
            const isWashAlert = washTemp !== '' && Number(washTemp) < 60;
            const isRinseAlert = rinseTemp !== '' && Number(rinseTemp) < 80;
            const isAlert = isWashAlert || isRinseAlert;
            const isCategoryDone = done && !isAlert;

            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><Droplets className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{isCategoryDone ? `Valmis - ${headerInfo}` : "Täytä lämpötilat"}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6 space-y-2"><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Pesu:</span> 60–65 °C</p><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Huuhtelu:</span> 80–85 °C</p></div><div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-4", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isWashAlert ? "text-accent" : "text-muted-foreground")}>PESULÄMPÖTILA</Label><Input type="number" placeholder="°C" value={washTemp} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("w-full h-10 font-black text-center text-lg", isWashAlert && "text-destructive border-destructive")}/></div><div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isRinseAlert ? "text-accent" : "text-muted-foreground")}>HUUHTELULÄMPÖTILA</Label><Input type="number" placeholder="°C" value={rinseTemp} onChange={(e) => handleUpdate(cat, targetName, 'value2', e.target.value)} className={cn("w-full h-10 font-black text-center text-lg", isRinseAlert && "text-destructive border-destructive")}/></div></div><div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}</Label><Input placeholder="Kirjaa huomiot tähän..." value={getVal(cat, targetName, 'comment')} onChange={(e) => handleUpdate(cat, targetName, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div></div></AccordionContent>
              </AccordionItem>
            );
          }

           if (cat === 'Buffet') {
            const isCategoryDone = buffetEntries.length > 0 && buffetEntries.every(entry => isDone(cat, `Buffet-${entry.type}-${entry.id}`));

            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><UtensilsCrossed className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6 space-y-2"><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Lämmin:</span> väh. +60°C.</p><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Kylmä:</span> enint. +6°C.</p></div><div className="space-y-4">
                    {buffetEntries.map((entry, index) => {
                      const targetName = `Buffet-${entry.type}-${entry.id}`;
                      const done = isDone(cat, targetName);
                      const val1 = getVal(cat, targetName, 'value');
                      const val2 = getVal(cat, targetName, 'value2');
                      const isHot = entry.type === 'hot'
                      const isAlert = isHot ? (val1 !== '' && Number(val1) < 60) || (val2 !== '' && Number(val2) < 60) : (val1 !== '' && Number(val1) > 6) || (val2 !== '' && Number(val2) > 6);

                      return (
                        <div key={entry.id} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                           <Button variant="ghost" size="icon" onClick={() => removeEntry(setBuffetEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
                           <Input placeholder={isHot ? `LÄMMIN TUOTE ${index+1}`: `KYLMÄ TUOTE ${index+1}`} value={getVal(cat, targetName, 'productName')} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
                           <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (ESILLE)</Label><Input type="number" placeholder="°C" value={val1} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center", (isAlert) && "text-destructive border-destructive")}/></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (2H)</Label><Input type="number" placeholder="°C" value={val2} onChange={(e) => handleUpdate(cat, targetName, 'value2', e.target.value)} className={cn("h-9 font-black text-center bg-black/40", (isAlert) && "text-destructive border-destructive")}/></div>
                           </div>
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => addEntry(setBuffetEntries, 'hot')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää lämmin</Button>
                      <Button onClick={() => addEntry(setBuffetEntries, 'cold')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää kylmä</Button>
                    </div></div></AccordionContent>
              </AccordionItem>
            )
          }

          if (cat === 'Kuumennus') {
            const isCategoryDone = heatingEntries.length > 0 && heatingEntries.every(entry => isDone(cat, `${entry.type === 'new' ? 'Valmistus' : 'Uudelleenkuumennus'}-${entry.id}`));
            
            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><Flame className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6 space-y-2"><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Valmistus:</span> yli +70°C (siipikarja +75°C).</p><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Uudelleenkuumennus:</span> yli +70°C.</p></div><div className="space-y-4">
                    {heatingEntries.map((entry, index) => {
                      const isNew = entry.type === 'new';
                      const targetName = `${isNew ? 'Valmistus' : 'Uudelleenkuumennus'}-${entry.id}`;
                      const done = isDone(cat, targetName);
                      const val = Number(getVal(cat, targetName, 'value'));
                      const productName = getVal(cat, targetName, 'productName');
                      const isPoultry = productName.toLowerCase().includes('broileri') || productName.toLowerCase().includes('kana');
                      const requiredTemp = isNew ? (isPoultry ? 75 : 70) : 70;
                      let isAlert = val > 0 && val < requiredTemp;

                      return (
                        <div key={entry.id} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                            <Button variant="ghost" size="icon" onClick={() => removeEntry(setHeatingEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
                            <Input placeholder={`${isNew ? 'Valmistettava tuote' : 'Uudelleenkuum. tuote'}`} value={productName} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C</Label><Input type="number" placeholder="°C" value={getVal(cat, targetName, 'value')} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                            </div>
                        </div>
                      )
                    })}
                     <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => addEntry(setHeatingEntries, 'new')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää valmistus</Button>
                        <Button onClick={() => addEntry(setHeatingEntries, 'reheat')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää kuumennus</Button>
                     </div></div></AccordionContent>
              </AccordionItem>
            )
          }

          if (cat === 'Jäähdytys') {
            const isCategoryDone = coolingEntries.length > 0 && coolingEntries.every(entry => isDone(cat, `Jäähdytys-${entry.id}`));
            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><Timer className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-4"><p className="text-xs text-muted-foreground font-medium">Jäähdytys +60°C &rarr; +6°C enintään 4 tunnissa.</p></div><div className="space-y-4">
                    {coolingEntries.map((entry) => {
                      const targetName = `Jäähdytys-${entry.id}`;
                      const done = isDone(cat, targetName);
                      const val = getVal(cat, targetName, 'value');
                      const val2 = getVal(cat, targetName, 'value2');
                      let isAlert = (val2 !== '' && Number(val2) > 6);
                      const startTime = getVal(cat, targetName, 'time');
                      const endTime = getVal(cat, targetName, 'time2');
                      if (startTime && endTime) { try { if (differenceInMinutes(parse(endTime, 'HH:mm', new Date()), parse(startTime, 'HH:mm', new Date())) > 240) isAlert = true; } catch (err) {} }
                      return (
                        <div key={entry.id} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                           <Button variant="ghost" size="icon" onClick={() => removeEntry(setCoolingEntries, entry.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-7 w-7"><Trash2 className="w-4 h-4" /></Button>
                           <Input placeholder="Jäähdytettävä tuote..." value={getVal(cat, targetName, 'productName')} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO (alku)</Label><Input type="time" value={startTime} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (alku)</Label><Input type="number" placeholder="°C" value={val} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className="h-9 font-black text-center bg-black/40"/></div>
                              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO (loppu)</Label><Input type="time" value={endTime} onChange={(e) => handleUpdate(cat, targetName, 'time2', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (loppu)</Label><Input type="number" placeholder="°C" value={val2} onChange={(e) => handleUpdate(cat, targetName, 'value2', e.target.value)} className={cn("h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/></div>
                           </div>
                           <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}</Label><Input placeholder="..." value={getVal(cat, targetName, 'comment')} onChange={(e) => handleUpdate(cat, targetName, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
                        </div>
                      )
                    })}
                    <Button onClick={() => addEntry(setCoolingEntries)} variant="outline" className="w-full border-dashed h-12 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää jäähdytys</Button></div></AccordionContent>
              </AccordionItem>
            )
          }
          
          if (TEMPLATE_CATEGORIES.includes(cat)) {
            const catTemplates = templates.filter(t => t.category === cat)
            const isCategoryDone = catTemplates.length > 0 && catTemplates.every(t => isDone(cat, t.name));

            return (
              <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}><
                        {cat === "Kylmälaitteet" ? <Refrigerator className="w-5 h-5" /> : cat === "Laitteet" ? <Wrench className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        </div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4"><div className="space-y-2">
                  {catTemplates.map(t => {
                    const done = isDone(cat, t.name)
                    const val = getVal(cat, t.name, 'value')
                    let isAlert = false
                    if (t.category === 'Kylmälaitteet') {
                      const limit = t.name.toLowerCase().includes('pakastin') ? -18 : 6;
                      if (val && Number(val) > limit) isAlert = true;
                    }

                    return (
                      <div key={t.id} className={cn("p-3 rounded-xl border transition-all flex flex-col gap-3", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                        <div className="flex items-start justify-between gap-4">
                           <div className="flex items-center gap-3 flex-1">
                             <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0 mt-1.5", done && !isAlert ? "bg-green-500/20 border-green-500/40 text-green-500" : "bg-white/5 border-white/10 text-muted-foreground")}><Check className="w-4 h-4" /></div>
                             <div className="flex-1"><Input value={getVal(cat, t.name, 'productName')} onChange={(e) => handleUpdate(cat, t.name, 'productName', e.target.value)} placeholder={t.name.toUpperCase()} className="h-9 text-xs font-bold uppercase bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"/></div>
                           </div>
                          <div className="flex items-center gap-2">
                            {t.type === 'checklist' ? <Checkbox checked={getVal(cat, t.name, 'status') === true} onCheckedChange={(checked) => handleUpdate(cat, t.name, 'status', checked)} className="w-6 h-6 border-white/20"/>
                            : t.type === 'date' ? <Input type="date" value={getVal(cat, t.name, 'time')} onChange={(e) => handleUpdate(cat, t.name, 'time', e.target.value)} className="h-9 bg-black/40 text-xs w-32"/>
                            : <Input type="number" placeholder="°C" value={val} onChange={(e) => handleUpdate(cat, t.name, 'value', e.target.value)} className={cn("w-20 h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/>
                            }
                          </div>
                        </div>
                         {(isAlert || t.type !== 'temperature') && (
                          <div className="space-y-1 pl-9"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE" : "HUOMIOT"}</Label><Input placeholder="..." value={getVal(cat, t.name, 'comment')} onChange={(e) => handleUpdate(cat, t.name, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
                        )}
                      </div>
                    )
                  })}
                  {catTemplates.length === 0 && <p className="text-[10px] uppercase font-bold text-muted-foreground/40 italic p-4 text-center">Ei valvontakohteita. Luo uusi "Muokkaa kohteita" -painikkeesta.</p>}
                   <Button onClick={() => setIsManageOpen(true)} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase mt-4"><Plus className="w-4 h-4 mr-2" /> Lisää / Muokkaa kohteita</Button>
                </div></AccordionContent>
              </AccordionItem>
            )
          }
          return null
        })}

        <AccordionItem value="arkisto" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
          <AccordionTrigger className="px-6 py-5 hover:no-underline"><div className="flex items-center gap-4 text-left"><div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Folder className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest text-blue-400">DOKUMENTTIARKISTO</h3><p className="text-[10px] text-muted-foreground font-black uppercase mt-0.5">Arkistoidut raportit ja lomakkeet</p></div></div></AccordionTrigger>
          <AccordionContent className="px-6 pb-8 pt-4"><div className="space-y-2">
                {archiveFiles.map(f => (
                  <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between group hover:bg-white/10">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-blue-400" /><span className="text-xs font-bold">{f.name}</span></div>
                    <Download className="w-4 h-4 text-muted-foreground/50" />
                  </a>
                ))}
                {archiveFiles.length === 0 && <p className="text-[10px] uppercase font-bold text-muted-foreground/40 italic p-4 text-center">Ei arkistoituja raportteja.</p>}
            </div></AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-10 p-6 rounded-3xl bg-black/20 border border-white/5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linkit ja ohjeet</h4>
        <div className="flex flex-wrap gap-4">
          {settings?.viranomaisohjeUrl && (
            <a 
              href={settings.viranomaisohjeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-accent hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Virallinen omavalvontaohje
            </a>
          )}
        </div>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden"><DialogHeader className="p-6 border-b border-white/5 bg-black/20"><div className="flex items-center justify-between"><CardTitle className="font-headline text-accent text-xl uppercase tracking-widest">Muokkaa kohteita</CardTitle><Button variant="ghost" size="icon" onClick={() => setIsManageOpen(false)}><X className="w-5 h-5" /></Button></div></DialogHeader><div className="p-6 space-y-6 overflow-y-auto"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">KOHTEEN NIMI</Label><Input value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="Esim. Kylmiö 3..." className="bg-black/40" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">KATEGORIA</Label><select value={newTargetCategory} onChange={(e) => setNewTargetCategory(e.target.value)} className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase">{TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-2 md:col-span-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">TYYPPI</Label><select value={newTargetType} onChange={(e) => setNewTargetType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase"><option value="temperature">Lämpötila (°C)</option><option value="checklist">Kuittaus (Tehty/Ei tehty)</option><option value="date">Päivämäärä</option></select></div><Button onClick={async () => {
                if (!firestore || !newTargetName.trim()) return
                await monitoringService.addTemplate(firestore, { name: newTargetName, category: newTargetCategory, type: newTargetType })
                setNewTargetName("")
                loadData()
              }} className="md:col-span-2 copper-gradient h-12 font-black uppercase text-xs">LISÄÄ UUSI KOHDE</Button></div>

            <div className="space-y-3"><h4 className="text-[10px] font-black uppercase tracking-widest text-accent px-1">Nykyiset kohteet</h4>
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div><p className="text-xs font-black uppercase">{t.name}</p><p className="text-[9px] text-muted-foreground uppercase">{t.category} • {t.type}</p></div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (!firestore) return
                    await monitoringService.deleteTemplate(firestore, t.id)
                    loadData()
                  }} className="text-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div></div></DialogContent>
      </Dialog>
    </div>
  )
}
