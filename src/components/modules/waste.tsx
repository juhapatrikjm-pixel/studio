"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingDown, 
  Plus, 
  Utensils, 
  Save,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Settings2,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  Zap,
  Globe,
  FileText,
  Download,
  Share2,
  Archive,
  History
} from "lucide-react"
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
import { collection, doc, query, orderBy, limit, where } from "firebase/firestore"
import { format, subMonths, startOfMonth } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { wasteEntrySchema } from "@/lib/validations"
import { ScrollArea } from "@/components/ui/scroll-area"
import { calculateWasteEntry } from "@/lib/calculations"
import * as wasteService from "@/services/waste-service"

type WasteGroup = {
  id: string
  name: string
  index: number
}

type WasteProduct = {
  id: string
  groupId: string
  name: string
  pricePerKg: number
  source?: string
  updatedAt?: any
}

type MonthlyWaste = {
  id: string
  monthName: string
  totalWasteCost: number
  totalPrepCost: number
  isArchived?: boolean
}

const DEFAULT_GROUPS = [
  { id: 'meat', name: 'LIHA', index: 0 },
  { id: 'fish', name: 'KALA', index: 1 },
  { id: 'dairy', name: 'MAITOTUOTTEET', index: 2 },
  { id: 'fruitveg', name: 'HEVI', index: 3 },
  { id: 'roots', name: 'JUUREKSET', index: 4 },
  { id: 'bakery', name: 'LEIPOMO', index: 5 },
  { id: 'frozen', name: 'PAKASTEET', index: 6 },
  { id: 'dry', name: 'KUIVATUOTTEET', index: 7 },
]

export function WasteModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [currentMonthId, setCurrentMonthId] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [isSeeding, setIsSeeding] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  
  const groupsRef = useMemo(() => (firestore ? collection(firestore, 'wasteGroups') : null), [firestore])
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore && currentMonthId ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const archiveQuery = useMemo(() => (firestore ? query(collection(firestore, 'cloudFiles'), where('category', '==', 'waste_report'), orderBy('createdAt', 'desc')) : null), [firestore])

  const { data: groups = [] } = useCollection<WasteGroup>(groupsRef ? query(groupsRef, orderBy('index', 'asc')) : null)
  const { data: products = [] } = useCollection<WasteProduct>(productsRef)
  const { data: monthlyStats } = useDoc<MonthlyWaste>(monthlyRef)
  const { data: archives = [] } = useCollection<any>(archiveQuery)
  
  const [step, setStep] = useState<'group' | 'product' | 'weight' | 'confirm'>('group')
  const [activeType, setActiveType] = useState<'prep' | 'waste'>('waste')
  const [selectedGroup, setSelectedGroup] = useState<WasteGroup | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<WasteProduct | null>(null)
  const [weight, setWeight] = useState("")
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const monthName = format(new Date(), 'MMMM yyyy', { locale: fi })

  const handleAISeed = async () => {
    if (!firestore) return
    setIsSeeding(true)
    toast({ title: "Haetaan hintoja...", description: "Yhdistetään tukkujärjestelmiin..." })
    try {
      const result = await wasteService.initializeWithAIPrices(firestore, DEFAULT_GROUPS)
      toast({ title: "Tietokanta alustettu", description: `Haettu ${result.count} tuotetta tukuista.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Päivitys epäonnistui" })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleLogWaste = async () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    const costNum = calculateWasteEntry(weight, selectedProduct.pricePerKg)
    const rawData = {
      productId: selectedProduct.id, 
      productName: selectedProduct.name,
      weight: weight, 
      cost: costNum, 
      type: activeType,
      monthId: currentMonthId
    }
    const result = wasteEntrySchema.safeParse({ ...rawData, date: new Date() })
    if (!result.success) {
      toast({ variant: "destructive", title: "Virhe", description: result.error.errors[0].message })
      return
    }
    try {
      await wasteService.logWasteEntry(firestore, result.data, currentMonthId)
      setStep('confirm')
      setTimeout(() => { 
        setStep('group'); setSelectedGroup(null); setSelectedProduct(null); setWeight(""); 
      }, 2000)
    } catch (e) {
      toast({ variant: "destructive", title: "Tallennus epäonnistui" })
    }
  }

  const handleArchiveMonth = async () => {
    if (!firestore || !user || !currentMonthId) return
    setIsArchiving(true)
    try {
      await wasteService.generateAndArchiveMonthlyReport(firestore, user.uid, currentMonthId, monthName)
      toast({ title: "Kuukausi arkistoitu", description: "PDF-raportti on luotu ja tallennettu arkistoon." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Arkistointi epäonnistui", description: e.message })
    } finally {
      setIsArchiving(false)
    }
  }

  const handleKeypadPress = (val: string) => {
    if (val === 'C') setWeight("")
    else if (val === ',') { if (!weight.includes(',')) setWeight(prev => prev + ',') }
    else if (weight.length < 6) setWeight(prev => prev + val)
  }

  const filteredProducts = products.filter(p => p.groupId === selectedGroup?.id)

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Hävikki</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" size="sm" onClick={handleAISeed} disabled={isSeeding} 
            className="h-9 px-4 text-[10px] font-black uppercase text-accent border border-accent/20 hover:bg-accent/5 gap-2"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} ALUSTA TUOTTEET
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="h-9 px-4 text-[10px] font-black uppercase text-muted-foreground hover:text-accent border border-white/5">
            <Settings2 className="w-4 h-4 mr-2" /> HALLINTA
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="industrial-card min-h-[600px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader className="bg-black/40 border-b border-white/5 p-4">
              <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black/60 border-white/10 h-12">
                  <TabsTrigger value="prep" className="text-[11px] font-black uppercase">PREP-HUKKA</TabsTrigger>
                  <TabsTrigger value="waste" className="text-[11px] font-black uppercase">HÄVIKKI</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4 mt-4">
                {step !== 'group' && <Button variant="ghost" size="icon" onClick={() => setStep(step === 'weight' ? 'product' : 'group')} className="h-10 w-10 text-accent"><ArrowLeft className="w-5 h-5" /></Button>}
                <h3 className="font-headline font-black text-xl uppercase tracking-widest">
                  {step === 'group' ? 'VALITSE RYHMÄ' : step === 'product' ? selectedGroup?.name : selectedProduct?.name}
                </h3>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-6">
              {step === 'group' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {groups.map(g => (
                    <button key={g.id} onClick={() => { setSelectedGroup(g); setStep('product'); }} className="aspect-square rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-4 hover:border-accent/40 hover:bg-accent/5 transition-all group">
                      <div className="w-14 h-14 rounded-2xl copper-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Utensils className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase text-center px-3 leading-tight tracking-widest">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'product' && (
                <ScrollArea className="h-[450px]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setStep('weight'); }} className="h-24 rounded-2xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1.5 hover:border-accent/40 hover:bg-white/5 transition-all p-2">
                        <span className="text-[10px] font-black uppercase text-center leading-tight truncate w-full">{p.name}</span>
                        <span className="text-[9px] text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-full">{p.pricePerKg.toFixed(2)} €/KG</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {step === 'weight' && selectedProduct && (
                <div className="max-w-md mx-auto space-y-8">
                  <div className="bg-black/60 border-2 border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                    <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mb-4">SYÖTETTY PAINO</p>
                    <div className="text-7xl font-black text-foreground tabular-nums tracking-tighter">
                      {weight || "0,00"}<span className="text-2xl text-accent ml-3">KG</span>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <Calculator className="w-5 h-5 text-accent/40" />
                      <span className="text-3xl font-black text-accent">
                        {calculateWasteEntry(weight, selectedProduct.pricePerKg).toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map(k => (
                      <button key={k} onClick={() => handleKeypadPress(k.toString())} className={cn("h-16 rounded-2xl text-2xl font-black shadow-lg border-b-4 transition-all active:scale-95 active:border-b-0", k === 'C' ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-white/5 text-foreground border-white/10")}>{k}</button>
                    ))}
                  </div>
                  <Button onClick={handleLogWaste} disabled={!weight} className="w-full h-20 copper-gradient text-white font-black text-xl rounded-2xl shadow-lg uppercase tracking-widest gap-4">
                    <Save className="w-7 h-7" /> KIRJAA HÄVIKKI
                  </Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-32 h-32 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center shadow-2xl animate-bounce">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </div>
                  <h3 className="text-4xl font-headline font-black uppercase tracking-tighter">KIRJAUS ONNISTUI</h3>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                <Calculator className="w-4 h-4" /> KUUKAUSI: {monthName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 shadow-inner">
                <p className="text-[10px] uppercase font-black text-destructive/60 mb-1 tracking-widest">HÄVIKKI</p>
                <p className="text-4xl font-black text-destructive tabular-nums">
                  {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-inner">
                <p className="text-[10px] uppercase font-black text-amber-500/60 mb-1 tracking-widest">PREP-HUKKA</p>
                <p className="text-4xl font-black text-amber-500 tabular-nums">
                  {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                </p>
              </div>
              
              <Button 
                onClick={handleArchiveMonth} 
                disabled={isArchiving || monthlyStats?.isArchived}
                className="w-full h-12 copper-gradient text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg"
              >
                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                {monthlyStats?.isArchived ? 'KUUKAUSI ARKISTOITU' : 'LUO KUUKAUSIRAPORTTI (PDF)'}
              </Button>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> HÄVIKKIRAPORTIT
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                <div className="p-4 space-y-3">
                  {archives.map((file: any) => (
                    <div key={file.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-accent/40 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[8px] text-muted-foreground uppercase font-bold">{file.size} • {format(file.createdAt?.toDate(), 'd.M.yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:bg-accent/10"><Download className="w-4 h-4" /></Button>
                        </a>
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent"
                          onClick={() => {
                            if (navigator.share) navigator.share({ title: file.name, url: file.url })
                            else { navigator.clipboard.writeText(file.url); toast({ title: "Linkki kopioitu!" }) }
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {archives.length === 0 && (
                    <div className="py-10 text-center opacity-20 italic text-[10px] uppercase font-black">Ei arkistoituja raportteja</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-background border-white/10 max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-headline text-accent text-xl uppercase tracking-widest">Tuotehallinta</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20 text-center">
            <Globe className="w-12 h-12 text-accent opacity-40" />
            <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tuotteet ja hinnat synkronoidaan suoraan tukuista.</p></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
