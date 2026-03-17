"use client"

import { useState, useMemo } from "react"
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
  X
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, query, orderBy, limit, where } from "firebase/firestore"
import { format } from "date-fns"
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
}

type MonthlyWaste = {
  id: string
  monthName: string
  totalWasteCost: number
  totalPrepCost: number
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

const DEFAULT_PRODUCTS: Record<string, { name: string, price: number }[]> = {
  meat: [
    { name: 'Naudan jauheliha 10%', price: 11.80 }, { name: 'Porsaan ulkofilee', price: 14.50 }, { name: 'Broilerin rintafilee', price: 17.20 }
  ],
  fish: [
    { name: 'Lohifilee D-leikkaus', price: 28.50 }, { name: 'Kirjolohifilee', price: 22.50 }
  ],
  dairy: [
    { name: 'Maito 1.5% 10L', price: 1.45 }, { name: 'Ruokakerma 15%', price: 4.20 }
  ],
  fruitveg: [
    { name: 'Omena Granny Smith', price: 3.20 }, { name: 'Banaani', price: 2.20 }
  ],
  roots: [
    { name: 'Peruna yleisperuna', price: 1.10 }, { name: 'Porkkana 1-luokka', price: 1.40 }
  ],
  bakery: [
    { name: 'Ruisleipä viipaloitu', price: 6.40 }, { name: 'Vaalea paahtoleipä', price: 4.95 }
  ],
  frozen: [
    { name: 'Pakasteherne', price: 4.20 }, { name: 'Pakastemustikka', price: 10.50 }
  ],
  dry: [
    { name: 'Vehnäjauho puolikarkea', price: 1.40 }, { name: 'Sokeri hienosokeri', price: 1.85 }
  ]
}

export function WasteModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [currentMonthId, setCurrentMonthId] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [isSeeding, setIsSeeding] = useState(false)
  
  const groupsRef = useMemo(() => (firestore ? collection(firestore, 'wasteGroups') : null), [firestore])
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore && currentMonthId ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const entriesRef = useMemo(() => (firestore ? collection(firestore, 'wasteEntries') : null), [firestore])

  const { data: groups = [] } = useCollection<WasteGroup>(groupsRef ? query(groupsRef, orderBy('index', 'asc')) : null)
  const { data: products = [] } = useCollection<WasteProduct>(productsRef)
  const { data: monthlyStats } = useDoc<MonthlyWaste>(monthlyRef)
  const { data: entries = [] } = useCollection<any>(entriesRef ? query(entriesRef, where('monthId', '==', currentMonthId), orderBy('date', 'desc'), limit(10)) : null)

  const [step, setStep] = useState<'group' | 'product' | 'weight' | 'confirm'>('group')
  const [activeType, setActiveType] = useState<'prep' | 'waste'>('waste')
  const [selectedGroup, setSelectedGroup] = useState<WasteGroup | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<WasteProduct | null>(null)
  const [weight, setWeight] = useState("")
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WasteGroup | null>(null)
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")

  const seedData = async () => {
    if (!firestore) return
    setIsSeeding(true)
    try {
      await wasteService.initializeProductDatabase(firestore, DEFAULT_GROUPS, DEFAULT_PRODUCTS);
      toast({ title: "Tukkuhinnat päivitetty" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Päivitys epäonnistui" });
    } finally {
      setIsSeeding(false)
    }
  }

  const handleLogWaste = async () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
    const costNum = calculateWasteEntry(weight, selectedProduct.pricePerKg);
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
      toast({ variant: "destructive", title: "Virhe", description: result.error.errors[0].message });
      return
    }

    try {
      await wasteService.logWasteEntry(firestore, result.data, currentMonthId);
      setStep('confirm');
      setTimeout(() => { 
        setStep('group'); 
        setSelectedGroup(null); 
        setSelectedProduct(null); 
        setWeight(""); 
      }, 2000);
    } catch (e) {
      toast({ variant: "destructive", title: "Tallennus epäonnistui" });
    }
  }

  const handleKeypadPress = (val: string) => {
    if (val === 'C') setWeight("");
    else if (val === ',') { if (!weight.includes(',')) setWeight(prev => prev + ','); }
    else if (weight.length < 6) setWeight(prev => prev + val);
  }

  const filteredProducts = products.filter(p => p.groupId === selectedGroup?.id)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Hävikki</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={seedData} disabled={isSeeding} className="h-9 px-4 text-[10px] font-black uppercase text-muted-foreground hover:text-accent border border-white/5">
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} ALUSTA TUOTTEET
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
                  <TabsTrigger value="prep" className="text-[11px] font-black uppercase data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">PREP-HUKKA</TabsTrigger>
                  <TabsTrigger value="waste" className="text-[11px] font-black uppercase data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">HÄVIKKI</TabsTrigger>
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
                    <button 
                      key={g.id} 
                      onClick={() => { setSelectedGroup(g); setStep('product'); }} 
                      className="aspect-square rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-4 hover:border-accent/40 hover:bg-accent/5 transition-all group"
                    >
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
                      <button 
                        key={p.id} 
                        onClick={() => { setSelectedProduct(p); setStep('weight'); }} 
                        className="h-24 rounded-2xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1.5 hover:border-accent/40 hover:bg-white/5 transition-all"
                      >
                        <span className="text-[10px] font-black uppercase text-center px-3 leading-tight truncate w-full">{p.name}</span>
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
                      <button 
                        key={k} 
                        onClick={() => handleKeypadPress(k.toString())} 
                        className={cn(
                          "h-16 rounded-2xl text-2xl font-black shadow-lg border-b-4 transition-all active:scale-95 active:border-b-0",
                          k === 'C' ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-white/5 text-foreground border-white/10"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <Button 
                    onClick={handleLogWaste} 
                    disabled={!weight} 
                    className="w-full h-20 copper-gradient text-white font-black text-xl rounded-2xl shadow-lg uppercase tracking-widest gap-4 metal-shine-overlay"
                  >
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
                <Calculator className="w-4 h-4" /> KUUKAUSI: {monthlyStats?.monthName || currentMonthId}
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground opacity-40 text-[10px] font-black uppercase tracking-widest p-20">
            Käytä "ALUSTA TUOTTEET" painiketta päivittääksesi tukkuhinnat.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
