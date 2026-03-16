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
  ChevronRight
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where, writeBatch } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { wasteEntrySchema } from "@/lib/validations"
import { ScrollArea } from "@/components/ui/scroll-area"
import { calculateWasteEntry } from "@/lib/calculations"

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

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
    // KÄYTETÄÄN PALVELUKERROSTA LASKENTAAN
    const costNum = calculateWasteEntry(weight, selectedProduct.pricePerKg);

    const rawData = {
      productId: selectedProduct.id, productName: selectedProduct.name,
      weight: weight, cost: costNum, type: activeType,
      monthId: currentMonthId, date: serverTimestamp()
    }

    const result = wasteEntrySchema.safeParse(rawData)
    if (!result.success) {
      toast({ variant: "destructive", title: "Virhe", description: result.error.errors[0].message });
      return
    }

    const entryId = Math.random().toString(36).substr(2, 9)
    setDoc(doc(firestore, 'wasteEntries', entryId), { ...result.data, id: entryId, date: serverTimestamp() });
    
    setDoc(doc(firestore, 'monthlyWaste', currentMonthId), {
      id: currentMonthId, monthName: format(new Date(), 'MMMM yyyy', { locale: fi }),
      totalWasteCost: increment(activeType === 'waste' ? costNum : 0),
      totalPrepCost: increment(activeType === 'prep' ? costNum : 0)
    }, { merge: true });

    setStep('confirm');
    setTimeout(() => { setStep('group'); setSelectedGroup(null); setSelectedProduct(null); setWeight(""); }, 2000);
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
        <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="h-9 px-4 text-[10px] font-black uppercase text-muted-foreground hover:text-accent border border-white/5"><Settings2 className="w-4 h-4 mr-2" /> HALLINTA</Button>
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
                <h3 className="font-headline font-black text-xl uppercase">{step === 'group' ? 'VALITSE RYHMÄ' : step === 'product' ? selectedGroup?.name : selectedProduct?.name}</h3>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-6">
              {step === 'group' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {groups.map(g => (
                    <button key={g.id} onClick={() => { setSelectedGroup(g); setStep('product'); }} className="aspect-square rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-4 hover:border-accent/40 hover:bg-accent/5 transition-all">
                      <div className="w-14 h-14 rounded-2xl copper-gradient flex items-center justify-center"><Utensils className="w-7 h-7 text-white" /></div>
                      <span className="text-[11px] font-black uppercase text-center px-3 leading-tight">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'product' && (
                <ScrollArea className="h-[450px]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setStep('weight'); }} className="h-24 rounded-2xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1.5 hover:border-accent/40">
                        <span className="text-[10px] font-black uppercase text-center px-3 leading-tight">{p.name}</span>
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
                    <div className="text-7xl font-black text-foreground tabular-nums tracking-tighter">{weight || "0,00"}<span className="text-2xl text-accent ml-3">KG</span></div>
                    <div className="mt-6 flex items-center justify-center gap-3"><Calculator className="w-5 h-5 text-accent/40" /><span className="text-3xl font-black text-accent">{calculateWasteEntry(weight, selectedProduct.pricePerKg).toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map(k => (
                      <button key={k} onClick={() => handleKeypadPress(k.toString())} className={cn("h-16 rounded-2xl text-2xl font-black shadow-lg border-b-4", k === 'C' ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-white/5 text-foreground border-white/10")}>{k}</button>
                    ))}
                  </div>
                  <Button onClick={handleLogWaste} disabled={!weight} className="w-full h-20 copper-gradient text-white font-black text-xl rounded-2xl shadow-lg uppercase tracking-widest gap-4"><Save className="w-7 h-7" /> KIRJAA HÄVIKKI</Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-32 h-32 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center shadow-2xl"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                  <h3 className="text-4xl font-headline font-black uppercase">KIRJAUS ONNISTUI</h3>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5"><CardTitle className="text-[10px] font-black text-accent uppercase tracking-widest"><Calculator className="w-4 h-4" /> KUUKAUSI: {monthlyStats?.monthName || currentMonthId}</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20"><p className="text-[10px] uppercase font-black text-destructive/60 mb-1">HÄVIKKI</p><p className="text-4xl font-black text-destructive">{monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €</p></div>
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20"><p className="text-[10px] uppercase font-black text-amber-500/60 mb-1">PREP-HUKKA</p><p className="text-4xl font-black text-amber-500">{monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
