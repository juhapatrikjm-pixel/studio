"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { 
  ShieldCheck, User, CalendarDays, Info, Refrigerator, Flame, Clock, Plus, Trash2, 
  CheckCircle2, Save, Loader2, AlertTriangle, Droplets, UtensilsCrossed,
  Check, Settings, X, Truck, Timer, Wrench, FileText, Download, Upload, Folder, Beef, Salad, Sparkles, UploadCloud
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection } from "@/firebase"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format, isValid, differenceInMinutes, parse } from "date-fns"
import { fi } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { collection, query, where, orderBy } from "firebase/firestore"
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [heatingEntries, setHeatingEntries] = useState<DynamicEntry[]>([{ id: Date.now() + 1, type: 'new' },{ id: Date.now() + 3, type: 'reheat' }]);
  const [buffetEntries, setBuffetEntries] = useState<DynamicEntry[]>([{ id: Date.now() + 5, type: 'hot' },{ id: Date.now() + 7, type: 'cold' }]);
  const [vastaanottoEntries, setVastaanottoEntries] = useState<DynamicEntry[]>([{id: Date.now()}]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Queries for Document Archive
  const reportsQuery = useMemo(() => firestore ? query(collection(firestore, 'cloudFiles'), where('folderId', '==', 'omavalvonta_arkisto'), where('type', '==', 'report'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const formsQuery = useMemo(() => firestore ? query(collection(firestore, 'cloudFiles'), where('folderId', '==', 'omavalvonta_arkisto'), where('type', '==', 'form'), orderBy('createdAt', 'desc')) : null, [firestore]);

  const { data: reportFiles = [] } = useCollection<any>(reportsQuery);
  const { data: formFiles = [] } = useCollection<any>(formsQuery);

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
    
    const key = `${category}_${targetName}`;
    const current = localValues[key] || { category, targetName, recordedBy: currentUserName, date: new Date() };
    const updated = { ...current, [field]: value, recordedBy: currentUserName, updatedAt: new Date() };
    
    setLocalValues(prev => ({ ...prev, [key]: updated }));
    await monitoringService.saveActiveRecord(firestore, user.uid, updated);
  }

  const generatePdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Omavalvontaraportti", 14, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Päivämäärä: ${currentDateDisplay}`, 14, 30);
    doc.text(`Raportin loi: ${currentUserName}`, 14, 36);

    const tableBody: any[][] = [];
    const tableHead = [['Kategoria', 'Kohde', 'Tulos', 'Huomiot/Toimenpide', 'Kirjaaja', 'Aika']];
    
    const CATEGORIES = ["Kylmälaitteet", "Kuumennus", "Jäähdytys", "Vastaanotto", "Buffet", "Astianpesu", "Puhdistus", "Laitteet"];
    CATEGORIES.forEach(cat => {
      const records = Object.values(localValues).filter((r: any) => r.category === cat && r.updatedAt);
      if (records.length > 0) {
        records.forEach((rec: any) => {
            const timestamp = rec.updatedAt?.toDate ? format(rec.updatedAt.toDate(), 'HH:mm') : '';
            let result = rec.value || rec.time || (rec.status ? 'OK' : '-');
            if (rec.value2) result += ` / ${rec.value2}`;
            if (rec.category === 'Kylmälaitteet' || ['Astianpesu', 'Vastaanotto'].includes(rec.category)) result += '°C';

            const target = rec.productName ? `${rec.targetName} (${rec.productName})` : rec.targetName;
            tableBody.push([rec.category, target, result, rec.comment || '-', rec.recordedBy || '-', timestamp]);
        });
      }
    });

    (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 121, 0] } 
    });

    return doc.output('blob');
  };

  const handleArchive = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
      const pdfBlob = generatePdf();
      const fileName = `omavalvonta-raportti-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      await monitoringService.uploadArchiveFile(firestore, user.uid, pdfBlob, fileName);

      await monitoringService.archiveMonitoringDay(firestore, user.uid, currentUserName);
      setLocalValues({});
      toast({ title: "Päivä arkistoitu onnistuneesti!", description: "PDF-raportti on luotu ja tallennettu arkistoon." });
      loadData();
    } catch (e) {
      console.error("Archiving failed:", e);
      toast({ variant: "destructive", title: "Arkistointi epäonnistui" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFormUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0 || !firestore || !user) return;
      const file = event.target.files[0];
      toast({ title: "Ladataan tiedostoa..." });
      try {
        await monitoringService.uploadFormFile(firestore, user.uid, file);
        toast({ title: "Lomake ladattu onnistuneesti!" });
      } catch (error) {
        toast({ variant: "destructive", title: "Lataus epäonnistui" });
      }
  };

  const getVal = (cat: string, target: string, field: string) => localValues[`${cat}_${target}`]?.[field] || "";

  const isDone = (cat: string, target: string) => {
    const record = localValues[`${cat}_${target}`];
    if (!record) return false;
    switch (cat) {
      case 'Jäähdytys': return !!(record.productName && record.time && record.value && record.time2 && record.value2);
      case 'Kuumennus': return !!(record.productName && record.value);
      case 'Buffet': return !!(record.productName && record.value && record.value2 && record.time);
      case 'Astianpesu': return !!(record.value && record.value2);
      case 'Vastaanotto': return !!(record.supplier && record.productName && record.value);
      default: return !!(record.value || record.status === true || record.time);
    }
  }

  const { totalTasks, completedTasks, progress } = useMemo(() => {
    const dynamicTasks = [
      ...coolingEntries.map(e => ({ cat: 'Jäähdytys', name: `Jäähdytys-${e.id}` })),
      ...heatingEntries.map(e => ({ cat: 'Kuumennus', name: `${e.type === 'new' ? 'Valmistus' : 'Uudelleenkuumennus'}-${e.id}` })),
      ...buffetEntries.map(e => ({ cat: 'Buffet', name: `Buffet-${e.type}-${e.id}` })),
      ...vastaanottoEntries.map(e => ({ cat: 'Vastaanotto', name: `Vastaanotto-${e.id}` }))
    ];
    const templateTasks = templates.map(t => ({ cat: t.category, name: t.name }));
    const staticTasks = [{ cat: 'Astianpesu', name: 'astianpesukone' }];

    const allTasks = [...dynamicTasks, ...templateTasks, ...staticTasks];
    const completed = allTasks.filter(task => isDone(task.cat, task.name)).length;
    
    return {
      totalTasks: allTasks.length,
      completedTasks: completed,
      progress: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0
    };
  }, [templates, localValues, coolingEntries, heatingEntries, buffetEntries, vastaanottoEntries]);

  const getHeaderInfo = (category: string) => {
    const catRecords = Object.values(localValues).filter((r: any) => r.category === category && r.updatedAt);
    if (catRecords.length === 0) return `0% tehty`;
    const latest = catRecords.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))[0];
    try {
      const dateObj = latest.updatedAt?.toDate ? latest.updatedAt.toDate() : new Date(latest.updatedAt);
      return `Viimeisin: ${format(dateObj, 'HH:mm')} (${latest.recordedBy?.split(' ')[0] || ''})`;
    } catch (e) { return `...`; }
  }
  
  const cheers = useMemo(() => ["Kokki on keittiön kuningas! 👑", "Tänään on loistava päivä tehdä taikuutta lautasella! ✨", "Pidetään veitset terävinä ja mieli kirkkaana! 🔪", "Keittiössä ei hikoilla, siellä loistetaan! 💪", "Mise en place on puoli voittoa! 🔥", "Tänään jokainen annos on mestariteos! 🎨", "Parasta ruokaa, parhaalla asenteella! 🥘", "Tiimityö on keittiön suola! 🧂", "Hymyile, asiakkaat maistavat rakkauden ruoassa! 😊", "Tänään vedetään täysillä, kuten aina! 🚀"], []);
  const [cheer, setCheer] = useState("")

  useEffect(() => {
    setCheer(cheers[Math.floor(Math.random() * cheers.length)])
  }, [cheers])

  if (!isMounted) return null

  const CATEGORIES = ["Kylmälaitteet", "Kuumennus", "Jäähdytys", "Vastaanotto", "Buffet", "Astianpesu", "Puhdistus", "Laitteet"];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <Card className="industrial-card border-accent/20 bg-accent/5"><CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20"><User className="w-6 h-6 text-accent" /></div><div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kirjaaja</p><p className="text-lg font-black text-foreground uppercase">{currentUserName}</p></div></div><div className="flex flex-col md:flex-row items-center gap-4"><div className="text-center md:text-right"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Päivämäärä</p><p className="text-lg font-black text-accent">{currentDateDisplay}</p></div><div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5"><CalendarDays className="w-6 h-6 text-muted-foreground" /></div></div></CardContent></Card>
       <Card className="industrial-card"><CardContent className="p-5 space-y-3"><div className="flex justify-between items-center"><p className="text-xs font-black uppercase tracking-widest text-accent">Päivän edistyminen</p><p className="text-sm font-black uppercase text-foreground">{completedTasks} / {totalTasks} TEHTY</p></div><div className="w-full bg-black/20 rounded-full h-2.5 border border-white/5"><div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="text-center text-xs text-muted-foreground font-medium pt-1">"{cheer}"</p></CardContent></Card>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1"><h2 className="text-3xl font-headline font-black text-accent uppercase tracking-tighter">Omavalvonta</h2><div className="flex gap-2"><Button variant="outline" onClick={() => setIsManageOpen(true)} className="border-white/10 text-muted-foreground hover:text-accent font-black text-[10px] uppercase h-11 px-6"><Settings className="w-4 h-4 mr-2" /> Muokkaa kohteita</Button><Button onClick={handleArchive} disabled={isSaving} className="copper-gradient font-black text-[10px] uppercase h-11 px-8 tracking-widest shadow-lg">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Arkistoi & Kuittaa</Button></div></div>
      <Accordion type="multiple" className="w-full space-y-4">
        {CATEGORIES.map(cat => {
          const headerInfo = getHeaderInfo(cat);
          const icon = cat === "Kylmälaitteet" ? <Refrigerator className="w-5 h-5"/> : cat === "Kuumennus" ? <Flame className="w-5 h-5"/> : cat === "Jäähdytys" ? <Timer className="w-5 h-5"/> : cat === "Vastaanotto" ? <Truck className="w-5 h-5"/> : cat === "Buffet" ? <UtensilsCrossed className="w-5 h-5"/> : cat === "Astianpesu" ? <Droplets className="w-5 h-5"/> : cat === "Puhdistus" ? <Sparkles className="w-5 h-5"/> : cat === "Laitteet" ? <Wrench className="w-5 h-5"/> : <ShieldCheck className="w-5 h-5"/>;
          const catTemplates = templates.filter(t => t.category === cat);
          
          const dynamicSections: any = { 'Kuumennus': { entries: heatingEntries }, 'Jäähdytys': { entries: coolingEntries }, 'Buffet': { entries: buffetEntries }, 'Vastaanotto': { entries: vastaanottoEntries } };
          const isDynamic = Object.keys(dynamicSections).includes(cat);
          if (!isDynamic && catTemplates.length === 0 && cat !== 'Astianpesu') return null;
          
          const isCategoryDone = isDynamic ? dynamicSections[cat].entries.every((e:any) => isDone(cat, `${cat === 'Jäähdytys' ? 'Jäähdytys' : cat === 'Kuumennus' ? (e.type === 'new' ? 'Valmistus' : 'Uudelleenkuumennus') : cat === 'Buffet' ? `Buffet-${e.type}` : 'Vastaanotto'}-${e.id}`)) : cat === 'Astianpesu' ? isDone(cat, 'astianpesukone') : catTemplates.every(t => isDone(cat, t.name));

          return (
            <AccordionItem key={cat} value={cat} className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
                <AccordionTrigger className="px-6 py-5 hover:no-underline group"><div className="flex items-center justify-between w-full pr-4"><div className="flex items-center gap-4 text-left"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", isCategoryDone ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-accent/10 border-accent/20 text-accent")}>{icon}</div><div><h3 className="text-sm font-black uppercase tracking-widest">{cat}</h3><p className="text-[10px] text-accent font-black uppercase mt-0.5 opacity-80">{headerInfo}</p></div></div>{isCategoryDone && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />}</div></AccordionTrigger>
                <AccordionContent className="px-6 pb-8 pt-4">
                  { cat === 'Astianpesu' ? <AstianpesuContent getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} /> : 
                    cat === 'Kuumennus' ? <KuumennusContent entries={heatingEntries} setEntries={setHeatingEntries} getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} addEntry={addEntry} removeEntry={removeEntry} /> : 
                    cat === 'Jäähdytys' ? <JaahdytysContent entries={coolingEntries} setEntries={setCoolingEntries} getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} addEntry={addEntry} removeEntry={removeEntry} /> : 
                    cat === 'Buffet' ? <BuffetContent entries={buffetEntries} setEntries={setBuffetEntries} getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} addEntry={addEntry} removeEntry={removeEntry} /> : 
                    cat === 'Vastaanotto' ? <VastaanottoContent entries={vastaanottoEntries} setEntries={setVastaanottoEntries} getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} addEntry={addEntry} removeEntry={removeEntry} /> : 
                    <TemplateContent templates={catTemplates} category={cat} getVal={getVal} handleUpdate={handleUpdate} isDone={isDone} openManage={() => setIsManageOpen(true)} />
                  }
                </AccordionContent>
            </AccordionItem>
          )
        })}

        <DokumenttiarkistoContent reportFiles={reportFiles} formFiles={formFiles} onFileUpload={handleFormUpload} fileInputRef={fileInputRef} />

      </Accordion>
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}><DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden"><DialogHeader className="p-6 border-b border-white/5 bg-black/20"><div className="flex items-center justify-between"><CardTitle className="font-headline text-accent text-xl uppercase tracking-widest">Muokkaa kohteita</CardTitle><Button variant="ghost" size="icon" onClick={() => setIsManageOpen(false)}><X className="w-5 h-5" /></Button></div></DialogHeader><div className="p-6 space-y-6 overflow-y-auto"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">KOHTEEN NIMI</Label><Input value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="Esim. Kylmiö 3..." className="bg-black/40" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">KATEGORIA</Label><select value={newTargetCategory} onChange={(e) => setNewTargetCategory(e.target.value)} className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase">{CATEGORIES.filter(c => !['Buffet', 'Kuumennus', 'Jäähdytys', 'Astianpesu', 'Vastaanotto'].includes(c)).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-2 md:col-span-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">TYYPPI</Label><select value={newTargetType} onChange={(e) => setNewTargetType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-black/40 px-3 py-2 text-sm font-black uppercase"><option value="temperature">Lämpötila (°C)</option><option value="checklist">Kuittaus (Tehty/Ei tehty)</option><option value="date">Päivämäärä</option></select></div><Button onClick={async () => { if (!firestore || !newTargetName.trim()) return; await monitoringService.addTemplate(firestore, { name: newTargetName, category: newTargetCategory, type: newTargetType }); setNewTargetName(""); loadData(); }} className="md:col-span-2 copper-gradient h-12 font-black uppercase text-xs">LISÄÄ UUSI KOHDE</Button></div><div className="space-y-3"><h4 className="text-[10px] font-black uppercase tracking-widest text-accent px-1">Nykyiset kohteet</h4>{templates.map(t => (<div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5"><div><p className="text-xs font-black uppercase">{t.name}</p><p className="text-[9px] text-muted-foreground uppercase">{t.category} • {t.type}</p></div><Button variant="ghost" size="icon" onClick={async () => { if (!firestore) return; await monitoringService.deleteTemplate(firestore, t.id); loadData(); }} className="text-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></div>))}
            </div></div></DialogContent></Dialog>
    </div>
  )
}

// To keep the main component cleaner, sub-components are created for complex content

const TemplateContent = ({ templates, category, getVal, handleUpdate, isDone, openManage }: any) => (
  <div className="space-y-2">
      {templates.map((t:any) => {
          const done = isDone(category, t.name);
          const val = getVal(category, t.name, 'value');
          let isAlert = false;
          if (t.category === 'Kylmälaitteet') {
              const limit = t.name.toLowerCase().includes('pakastin') ? -18 : 6;
              if (val && Number(val) > limit) isAlert = true;
          }
          return (
              <div key={t.id} className={cn("p-3 rounded-xl border transition-all flex flex-col gap-3", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                  <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3"><div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0", done && !isAlert ? "bg-green-500/20 border-green-500/40 text-green-500" : "bg-white/5 border-white/10 text-muted-foreground")}>{done && !isAlert ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}</div><p className="text-xs font-bold uppercase tracking-tight flex-1">{getVal(category, t.name, 'productName') || t.name}</p></div>
                      <div className="flex items-center gap-2">
                          {t.type === 'checklist' ? <Checkbox checked={getVal(category, t.name, 'status') === true} onCheckedChange={(checked) => handleUpdate(category, t.name, 'status', checked)} className="w-6 h-6 border-white/20"/>
                           : t.type === 'date' ? <Input type="date" value={getVal(category, t.name, 'time')} onChange={(e) => handleUpdate(category, t.name, 'time', e.target.value)} className="h-9 bg-black/40 text-xs w-32"/>
                           : <Input type="number" placeholder="°C" value={val} onChange={(e) => handleUpdate(category, t.name, 'value', e.target.value)} className={cn("w-20 h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/>}
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-9">
                      {t.category === 'Kylmälaitteet' && <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">OMA NIMI</Label><Input placeholder="Esim. Juomakylmiö..." value={getVal(category, t.name, 'productName')} onChange={(e) => handleUpdate(category, t.name, 'productName', e.target.value)} className="h-8 text-[10px] bg-black/40"/></div>}
                      <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE" : "HUOMIOT"}</Label><Input placeholder="..." value={getVal(category, t.name, 'comment')} onChange={(e) => handleUpdate(category, t.name, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
                  </div>
              </div>
          )
      })}
      {templates.length === 0 && <p className="text-[10px] uppercase font-bold text-muted-foreground/40 italic p-4 text-center">Ei valvontakohteita. Luo uusi "Muokkaa kohteita" -painikkeesta.</p>}
      <Button onClick={openManage} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase mt-4"><Plus className="w-4 h-4 mr-2" /> Lisää / Muokkaa kohteita</Button>
  </div>
);

const AstianpesuContent = ({ getVal, handleUpdate, isDone }: any) => {
    const targetName = 'astianpesukone';
    const washTemp = getVal('Astianpesu', targetName, 'value');
    const rinseTemp = getVal('Astianpesu', targetName, 'value2');
    const done = isDone('Astianpesu', targetName);
    const isWashAlert = washTemp !== '' && Number(washTemp) < 60;
    const isRinseAlert = rinseTemp !== '' && Number(rinseTemp) < 80;
    const isAlert = isWashAlert || isRinseAlert;

    return (
        <>
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6 space-y-2"><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Pesuveden lämpötila:</span> 60–65 °C.</p><p className="text-xs text-muted-foreground font-medium"><span className="font-bold text-accent">Huuhteluveden lämpötila:</span> 80–85 °C.</p></div>
            <div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-4", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isWashAlert ? "text-accent" : "text-muted-foreground")}>PESULÄMPÖTILA</Label><Input type="number" placeholder="°C" value={washTemp} onChange={(e) => handleUpdate('Astianpesu', targetName, 'value', e.target.value)} className={cn("w-full h-10 font-black text-center text-lg", isWashAlert && "text-destructive border-destructive")}/></div>
                    <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isRinseAlert ? "text-accent" : "text-muted-foreground")}>HUUHTELULÄMPÖTILA</Label><Input type="number" placeholder="°C" value={rinseTemp} onChange={(e) => handleUpdate('Astianpesu', targetName, 'value2', e.target.value)} className={cn("w-full h-10 font-black text-center text-lg", isRinseAlert && "text-destructive border-destructive")}/></div>
                </div>
                <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}</Label><Input placeholder="Kirjaa huomiot tähän..." value={getVal('Astianpesu', targetName, 'comment')} onChange={(e) => handleUpdate('Astianpesu', targetName, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
            </div>
        </>
    )
}

const DynamicEntryContent = ({ entries, setEntries, cat, getVal, handleUpdate, isDone, addEntry, removeEntry, renderEntry }: any) => (
    <div className="space-y-4">
        {entries.map((entry: any, index: number) => renderEntry({ entry, index, cat, getVal, handleUpdate, isDone, removeEntry, setEntries }))}
        {cat === 'Kuumennus' || cat === 'Buffet' ? (
             <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => addEntry(setEntries, cat === 'Kuumennus' ? 'new' : 'hot')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää {cat === 'Kuumennus' ? 'valmistus' : 'lämmin'}</Button>
                <Button onClick={() => addEntry(setEntries, cat === 'Kuumennus' ? 'reheat' : 'cold')} variant="outline" className="w-full border-dashed h-10 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää {cat === 'Kuumennus' ? 'kuumennus' : 'kylmä'}</Button>
             </div>
        ) : (
             <Button onClick={() => addEntry(setEntries)} variant="outline" className="w-full border-dashed h-12 text-xs font-black uppercase"><Plus className="w-4 h-4 mr-2" /> Lisää {cat.toLowerCase()}</Button>
        )}
    </div>
);

const KuumennusContent = (props: any) => <DynamicEntryContent {...props} cat="Kuumennus" renderEntry={KuumennusEntry} />;
const JaahdytysContent = (props: any) => <DynamicEntryContent {...props} cat="Jäähdytys" renderEntry={JaahdytysEntry} />;
const BuffetContent = (props: any) => <DynamicEntryContent {...props} cat="Buffet" renderEntry={BuffetEntry} />;
const VastaanottoContent = (props: any) => <DynamicEntryContent {...props} cat="Vastaanotto" renderEntry={VastaanottoEntry} />;

const KuumennusEntry = ({ entry, getVal, handleUpdate, isDone, removeEntry, setEntries }: any) => {
  const cat = 'Kuumennus';
  const isNew = entry.type === 'new';
  const targetName = `${isNew ? 'Valmistus' : 'Uudelleenkuumennus'}-${entry.id}`;
  const done = isDone(cat, targetName);
  const val = Number(getVal(cat, targetName, 'value'));
  const productName = getVal(cat, targetName, 'productName');
  const isPoultry = productName.toLowerCase().includes('broileri') || productName.toLowerCase().includes('kana');
  const requiredTemp = isNew ? (isPoultry ? 75 : 70) : 70;
  let isAlert = val > 0 && val < requiredTemp;

  return (
    <div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
        <Button variant="ghost" size="icon" onClick={() => removeEntry(setEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
        <Input placeholder={`${isNew ? 'Valmistettava' : 'Uudelleenkuumennnettava'} tuote...`} value={productName} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C</Label><Input type="number" placeholder="°C" value={getVal(cat, targetName, 'value')} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/></div>
            <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
        </div>
    </div>
  );
};
const JaahdytysEntry = ({ entry, getVal, handleUpdate, isDone, removeEntry, setEntries }:any) => {
    const cat = 'Jäähdytys';
    const targetName = `Jäähdytys-${entry.id}`;
    const done = isDone(cat, targetName);
    const val2 = getVal(cat, targetName, 'value2');
    let isAlert = (val2 && Number(val2) > 6) || (getVal(cat, targetName, 'time') && getVal(cat, targetName, 'time2') && differenceInMinutes(parse(getVal(cat, targetName, 'time2'), 'HH:mm', new Date()), parse(getVal(cat, targetName, 'time'), 'HH:mm', new Date())) > 240);
    return (
        <div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
            <Button variant="ghost" size="icon" onClick={() => removeEntry(setEntries, entry.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-7 w-7"><Trash2 className="w-4 h-4" /></Button>
            <Input placeholder="Jäähdytettävä tuote..." value={getVal(cat, targetName, 'productName')} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">ALKU KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">ALKU °C</Label><Input type="number" placeholder="°C" value={getVal(cat, targetName, 'value')} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className="h-9 font-black text-center bg-black/40"/></div>
                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">LOPPU KLO</Label><Input type="time" value={getVal(cat, targetName, 'time2')} onChange={(e) => handleUpdate(cat, targetName, 'time2', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
                <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">LOPPU °C</Label><Input type="number" placeholder="°C" value={val2} onChange={(e) => handleUpdate(cat, targetName, 'value2', e.target.value)} className={cn("h-9 font-black text-center bg-black/40", isAlert && "text-destructive border-destructive")}/></div>
            </div>
            <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}</Label><Input placeholder="..." value={getVal(cat, targetName, 'comment')} onChange={(e) => handleUpdate(cat, targetName, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
        </div>
    );
};

const BuffetEntry = ({ entry, getVal, handleUpdate, isDone, removeEntry, setEntries }:any) => {
    const cat = 'Buffet';
    const targetName = `Buffet-${entry.type}-${entry.id}`;
    const done = isDone(cat, targetName);
    const val1 = getVal(cat, targetName, 'value');
    const val2 = getVal(cat, targetName, 'value2');
    const isHot = entry.type === 'hot';
    const isAlert = isHot ? (val1 !== '' && Number(val1) < 60) || (val2 !== '' && Number(val2) < 60) : (val1 !== '' && Number(val1) > 6) || (val2 !== '' && Number(val2) > 6);
    return (
      <div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
         <Button variant="ghost" size="icon" onClick={() => removeEntry(setEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
         <Input placeholder={isHot ? 'Lämmin tuote...': 'Kylmä tuote...'} value={getVal(cat, targetName, 'productName')} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-10 bg-black/40 text-xs font-bold uppercase flex-1 pr-10"/>
         <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (ESILLE)</Label><Input type="number" placeholder="°C" value={val1} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/></div>
              <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C (2H)</Label><Input type="number" placeholder="°C" value={val2} onChange={(e) => handleUpdate(cat, targetName, 'value2', e.target.value)} className={cn("h-9 font-black text-center bg-black/40", isAlert && "text-destructive border-destructive")}/></div>
         </div>
      </div>
    )
}

const VastaanottoEntry = ({ entry, getVal, handleUpdate, isDone, removeEntry, setEntries }: any) => {
  const cat = 'Vastaanotto';
  const targetName = `Vastaanotto-${entry.id}`;
  const done = isDone(cat, targetName);
  const val = getVal(cat, targetName, 'value');
  const productName = getVal(cat, targetName, 'productName');
  const isAlert = val !== '' && (Number(val) > 6 || Number(val) < 0) && !productName.toLowerCase().includes('pakaste');
  return (
    <div className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative", isAlert ? "bg-destructive/10 border-destructive/40" : "bg-black/20 border-white/5", done && !isAlert && "border-green-500/30")}>
        <Button variant="ghost" size="icon" onClick={() => removeEntry(setEntries, entry.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-2 right-2"><Trash2 className="w-4 h-4" /></Button>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Toimittaja" value={getVal(cat, targetName, 'supplier')} onChange={(e) => handleUpdate(cat, targetName, 'supplier', e.target.value)} className="h-9 bg-black/40 text-xs font-bold uppercase" />
          <Input placeholder="Tuote" value={productName} onChange={(e) => handleUpdate(cat, targetName, 'productName', e.target.value)} className="h-9 bg-black/40 text-xs font-bold uppercase" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">°C</Label><Input type="number" placeholder="°C" value={val} onChange={(e) => handleUpdate(cat, targetName, 'value', e.target.value)} className={cn("h-9 font-black text-center", isAlert && "text-destructive border-destructive")}/></div>
            <div className="space-y-1"><Label className="text-[8px] uppercase font-black text-muted-foreground">KLO</Label><Input type="time" value={getVal(cat, targetName, 'time')} onChange={(e) => handleUpdate(cat, targetName, 'time', e.target.value)} className="h-9 bg-black/40 text-xs"/></div>
        </div>
        <div className="space-y-1"><Label className={cn("text-[8px] uppercase font-black", isAlert ? "text-accent" : "text-muted-foreground")}>{isAlert ? "POIKKEAMA / TOIMENPIDE (VAADITAAN)" : "HUOMIOT"}</Label><Input placeholder="..." value={getVal(cat, targetName, 'comment')} onChange={(e) => handleUpdate(cat, targetName, 'comment', e.target.value)} className={cn("h-8 text-[10px] bg-black/40", isAlert && "border-accent/40 ring-1 ring-accent/20")}/></div>
    </div>
  )
}

const DokumenttiarkistoContent = ({ reportFiles, formFiles, onFileUpload, fileInputRef }: any) => {
  const [activeTab, setActiveTab] = useState('reports');

  const FileItem = ({ file }: any) => (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-blue-400" /><span className="text-xs font-bold">{file.name}</span></div>
      <Download className="w-4 h-4 text-muted-foreground/50" />
    </a>
  );

  return (
    <AccordionItem value="arkisto" className="industrial-card border-none bg-white/5 rounded-3xl overflow-hidden px-0">
      <AccordionTrigger className="px-6 py-5 hover:no-underline"><div className="flex items-center gap-4 text-left"><div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Folder className="w-5 h-5" /></div><div><h3 className="text-sm font-black uppercase tracking-widest text-blue-400">DOKUMENTTIARKISTO</h3><p className="text-[10px] text-muted-foreground font-black uppercase mt-0.5">Raportit ja lomakkeet</p></div></div></AccordionTrigger>
      <AccordionContent className="px-6 pb-8 pt-4">
        <div className="flex gap-1 border-b border-white/10 mb-4">
          <Button onClick={() => setActiveTab('reports')} variant={activeTab === 'reports' ? 'secondary' : 'ghost'} className="text-xs h-9 px-4">Arkistoidut Raportit</Button>
          <Button onClick={() => setActiveTab('forms')} variant={activeTab === 'forms' ? 'secondary' : 'ghost'} className="text-xs h-9 px-4">Tyhjät Lomakkeet</Button>
        </div>
        <div className="space-y-2">
          {activeTab === 'reports' && (reportFiles.length > 0 ? reportFiles.map((f: any) => <FileItem key={f.id} file={f} />) : <p className="text-xs text-center p-4 text-muted-foreground">Ei arkistoituja raportteja.</p>)}
          {activeTab === 'forms' && (
            <>
              {formFiles.length > 0 ? formFiles.map((f: any) => <FileItem key={f.id} file={f} />) : <p className="text-xs text-center p-4 text-muted-foreground">Ei ladattuja lomakkeita.</p>}
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full border-dashed h-12 text-xs font-black uppercase mt-4"><UploadCloud className="w-4 h-4 mr-2" /> LATAA UUSI LOMAKE</Button>
              <Input type="file" ref={fileInputRef} onChange={onFileUpload} className="hidden" />
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};