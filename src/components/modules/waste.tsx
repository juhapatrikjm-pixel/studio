
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
  ChevronRight,
  X
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where, writeBatch } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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
    { name: 'Naudan jauheliha', price: 9.50 }, { name: 'Porsaan filee', price: 12.20 }, { name: 'Kana rinta', price: 14.50 },
    { name: 'Pekoni', price: 8.90 }, { name: 'Karjalanpaisti', price: 11.00 }, { name: 'Naudan sisäpaisti', price: 18.50 },
    { name: 'Broilerin koipi', price: 4.50 }, { name: 'Sian kylki', price: 7.80 }, { name: 'Lammas', price: 22.00 },
    { name: 'Nakki', price: 6.50 }, { name: 'Kinkkuviipale', price: 9.20 }, { name: 'Naudan ulkofilee', price: 24.50 },
    { name: 'Porsaan niska', price: 8.50 }, { name: 'Broilerin siivet', price: 5.90 }, { name: 'Naudan rinta', price: 13.50 },
    { name: 'Porsaan potka', price: 6.20 }, { name: 'Kalkkuna', price: 11.50 }, { name: 'Riista', price: 28.00 },
    { name: 'Maksapasteija', price: 7.20 }, { name: 'Lihaliemi-pohja', price: 5.50 }
  ],
  fish: [
    { name: 'Lohifilee', price: 22.50 }, { name: 'Kirjolohi', price: 18.20 }, { name: 'Kuha', price: 32.00 },
    { name: 'Ahven', price: 28.50 }, { name: 'Siika', price: 26.00 }, { name: 'Silakka', price: 8.50 },
    { name: 'Muikku', price: 12.50 }, { name: 'Turska', price: 16.50 }, { name: 'Katkarapu', price: 14.90 },
    { name: 'Jättikatkarapu', price: 24.00 }, { name: 'Merilohi', price: 21.00 }, { name: 'Savulohi', price: 29.50 },
    { name: 'Kylmäsavulohi', price: 34.00 }, { name: 'Graavilohi', price: 32.00 }, { name: 'Kalaliemi', price: 4.50 },
    { name: 'Rapu', price: 19.50 }, { name: 'Simpukka', price: 11.50 }, { name: 'Mustekala', price: 15.00 },
    { name: 'Tonnikala', price: 12.50 }, { name: 'Kalapuikko', price: 6.50 }
  ],
  dairy: [
    { name: 'Maito', price: 1.20 }, { name: 'Kerma 35%', price: 4.50 }, { name: 'Voi', price: 8.50 },
    { name: 'Juustoraaste', price: 9.20 }, { name: 'Jogurtti', price: 2.50 }, { name: 'Viili', price: 1.80 },
    { name: 'Rahka', price: 3.50 }, { name: 'Smetana', price: 6.50 }, { name: 'Creme fraiche', price: 5.80 },
    { name: 'Raejuusto', price: 7.20 }, { name: 'Maidonvastike', price: 2.20 }, { name: 'Kasvirasva', price: 3.50 },
    { name: 'Sulatejuusto', price: 8.90 }, { name: 'Homejuusto', price: 16.50 }, { name: 'Mozzarella', price: 11.50 },
    { name: 'Parmesan', price: 24.00 }, { name: 'Fetajuusto', price: 13.50 }, { name: 'Halloumi', price: 15.50 },
    { name: 'Kananmuna', price: 3.20 }, { name: 'Maitojauhe', price: 6.50 }
  ],
  fruitveg: [
    { name: 'Omena', price: 2.50 }, { name: 'Banaani', price: 1.80 }, { name: 'Appelsiini', price: 2.20 },
    { name: 'Tomaatti', price: 3.50 }, { name: 'Kurkku', price: 2.80 }, { name: 'Jäävuorisalaatti', price: 4.20 },
    { name: 'Paprika', price: 5.50 }, { name: 'Porkkana', price: 1.20 }, { name: 'Peruna', price: 0.90 },
    { name: 'Sipuli', price: 1.50 }, { name: 'Valkosipuli', price: 8.50 }, { name: 'Parsakaali', price: 4.80 },
    { name: 'Kukkakaali', price: 3.90 }, { name: 'Pinaatti', price: 9.50 }, { name: 'Herkkusieni', price: 7.50 },
    { name: 'Marjat', price: 12.50 }, { name: 'Rypäle', price: 4.50 }, { name: 'Meloni', price: 2.20 },
    { name: 'Sitruuna', price: 3.20 }, { name: 'Lime', price: 5.50 }
  ],
  roots: [
    { name: 'Peruna yleis', price: 0.85 }, { name: 'Porkkana', price: 1.10 }, { name: 'Lanttu', price: 1.40 },
    { name: 'Punajuuri', price: 1.60 }, { name: 'Nauris', price: 1.90 }, { name: 'Juuriselleri', price: 2.50 },
    { name: 'Palsternakka', price: 3.20 }, { name: 'Keltasipuli', price: 1.30 }, { name: 'Punasipuli', price: 1.80 },
    { name: 'Purjosipuli', price: 3.50 }, { name: 'Valkosipuli', price: 7.90 }, { name: 'Inkivääri', price: 6.50 },
    { name: 'Piparjuuri', price: 14.50 }, { name: 'Radis', price: 4.20 }, { name: 'Retikka', price: 2.80 },
    { name: 'Jamssi', price: 5.50 }, { name: 'Bataatti', price: 2.90 }, { name: 'Artisokka', price: 8.50 },
    { name: 'Maa-artisokka', price: 6.20 }, { name: 'Wasabi-juuri', price: 45.00 }
  ],
  bakery: [
    { name: 'Ruisleipä', price: 5.50 }, { name: 'Vaalea leipä', price: 4.20 }, { name: 'Sämpylä', price: 6.50 },
    { name: 'Paistopiste-leipä', price: 4.80 }, { name: 'Pulla', price: 8.50 }, { name: 'Viineri', price: 12.50 },
    { name: 'Täytekakku', price: 22.00 }, { name: 'Keksi', price: 9.50 }, { name: 'Korppu', price: 7.20 },
    { name: 'Näkkileipä', price: 6.50 }, { name: 'Tortilla', price: 5.80 }, { name: 'Pitaleipä', price: 6.20 },
    { name: 'Bagel', price: 8.90 }, { name: 'Croissant', price: 11.50 }, { name: 'Munkki', price: 9.20 },
    { name: 'Donitsi', price: 10.50 }, { name: 'Piirakka', price: 14.00 }, { name: 'Pizzapohja', price: 5.50 },
    { name: 'Taikina', price: 4.20 }, { name: 'Jauhot', price: 1.50 }
  ],
  frozen: [
    { name: 'Pakastevihannes', price: 3.50 }, { name: 'Pakastemarja', price: 8.50 }, { name: 'Pakastekala', price: 14.50 },
    { name: 'Pakasteliha', price: 11.20 }, { name: 'Ranskalaiset', price: 2.80 }, { name: 'Pakastepizza', price: 7.50 },
    { name: 'Valmisruoka', price: 6.50 }, { name: 'Jäätelö', price: 9.50 }, { name: 'Leivonnaispakaste', price: 10.20 },
    { name: 'Jääpala', price: 1.50 }, { name: 'Smoothie-aines', price: 12.00 }, { name: 'Pakasteyrtti', price: 18.50 },
    { name: 'Pakasteperuna', price: 2.20 }, { name: 'Pakastemuhennos', price: 5.50 }, { name: 'Pakastekeitto', price: 4.80 },
    { name: 'Pakastekastike', price: 6.20 }, { name: 'Pakastepasta', price: 5.50 }, { name: 'Pakasteleipä', price: 4.50 },
    { name: 'Pakastehedelmä', price: 7.20 }, { name: 'Pakastesieni', price: 14.00 }
  ],
  dry: [
    { name: 'Vehnäjauho', price: 1.20 }, { name: 'Sokeri', price: 1.50 }, { name: 'Suola', price: 0.80 },
    { name: 'Mausteseos', price: 18.50 }, { name: 'Pasta', price: 2.20 }, { name: 'Riisi', price: 2.50 },
    { name: 'Nuudeli', price: 3.50 }, { name: 'Ryyni', price: 1.80 }, { name: 'Hiutale', price: 1.50 },
    { name: 'Murot', price: 5.50 }, { name: 'Palkokasvi', price: 3.20 }, { name: 'Öljy', price: 4.50 },
    { name: 'Etikka', price: 3.80 }, { name: 'Kastike-kuiva', price: 8.50 }, { name: 'Säilyke', price: 5.20 },
    { name: 'Kahvi', price: 14.00 }, { name: 'Tee', price: 22.00 }, { name: 'Kaakao', price: 9.50 },
    { name: 'Pähkinä', price: 16.50 }, { name: 'Siemen', price: 12.50 }
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
      const batch = writeBatch(firestore)
      
      // Tyhjennetään vanhat
      groups.forEach(g => batch.delete(doc(firestore, 'wasteGroups', g.id)))
      products.forEach(p => batch.delete(doc(firestore, 'wasteProducts', p.id)))

      // Luodaan ryhmät
      DEFAULT_GROUPS.forEach(g => {
        batch.set(doc(firestore, 'wasteGroups', g.id), g)
        
        // Luodaan tuotteet ryhmän alle
        const groupProducts = DEFAULT_PRODUCTS[g.id] || []
        groupProducts.forEach((p, idx) => {
          const pid = `${g.id}_${idx}`
          batch.set(doc(firestore, 'wasteProducts', pid), {
            id: pid,
            groupId: g.id,
            name: p.name,
            pricePerKg: p.price
          })
        })
      })

      await batch.commit()
      toast({ title: "Tuotteet alustettu", description: "8 ryhmää ja 160 tuotetta ladattu." })
    } catch (e: any) {
      console.error("Seed error:", e)
      toast({ variant: "destructive", title: "Alustus epäonnistui", description: e.message })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
    const costNum = calculateWasteEntry(weight, selectedProduct.pricePerKg);

    const rawData = {
      productId: selectedProduct.id, 
      productName: selectedProduct.name,
      weight: weight, 
      cost: costNum, 
      type: activeType,
      monthId: currentMonthId, 
      date: serverTimestamp()
    }

    const result = wasteEntrySchema.safeParse(rawData)
    if (!result.success) {
      toast({ variant: "destructive", title: "Virhe", description: result.error.errors[0].message });
      return
    }

    const entryId = Math.random().toString(36).substr(2, 9)
    setDoc(doc(firestore, 'wasteEntries', entryId), { ...result.data, id: entryId, date: serverTimestamp() });
    
    setDoc(doc(firestore, 'monthlyWaste', currentMonthId), {
      id: currentMonthId, 
      monthName: format(new Date(), 'MMMM yyyy', { locale: fi }),
      totalWasteCost: increment(activeType === 'waste' ? costNum : 0),
      totalPrepCost: increment(activeType === 'prep' ? costNum : 0)
    }, { merge: true });

    setStep('confirm');
    setTimeout(() => { 
      setStep('group'); 
      setSelectedGroup(null); 
      setSelectedProduct(null); 
      setWeight(""); 
    }, 2000);
  }

  const handleKeypadPress = (val: string) => {
    if (val === 'C') setWeight("");
    else if (val === ',') { if (!weight.includes(',')) setWeight(prev => prev + ','); }
    else if (weight.length < 6) setWeight(prev => prev + val);
  }

  const deleteProduct = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'wasteProducts', id))
  }

  const addProduct = () => {
    if (!editingGroup || !newProductName || !newProductPrice || !firestore) return
    const id = Math.random().toString(36).substr(2, 9)
    setDoc(doc(firestore, 'wasteProducts', id), {
      id,
      groupId: editingGroup.id,
      name: newProductName,
      pricePerKg: Number(newProductPrice.replace(',', '.'))
    })
    setNewProductName(""); setNewProductPrice("");
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
                  {groups.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <p className="text-xs uppercase font-black tracking-widest mb-4">Ryhmät puuttuvat.</p>
                      <Button onClick={seedData} className="copper-gradient">Alusta järjestelmä</Button>
                    </div>
                  )}
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
              
              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] px-1">VIIMEISIMMÄT KIRJAUKSET</h4>
                <ScrollArea className="h-48 pr-2">
                  <div className="space-y-2">
                    {entries.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold">
                        <div className="flex items-center gap-2 truncate">
                          <div className={cn("w-1.5 h-1.5 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                          <span className="truncate uppercase">{e.productName}</span>
                        </div>
                        <span className="text-accent">{e.cost.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HALLINTA DIALOG */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-background border-white/10 max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-headline text-accent text-xl uppercase tracking-widest">Tuotehallinta</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></Button>
            </div>
            <DialogDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest mt-1">
              Muokkaa hintoja ja hallitse tuotevalikoimaa
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
            <div className="border-r border-white/5 bg-black/10 overflow-y-auto">
              <div className="p-4 space-y-1">
                {groups.map(g => (
                  <button 
                    key={g.id} 
                    onClick={() => setEditingGroup(g)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                      editingGroup?.id === g.id ? "bg-accent/20 text-accent border border-accent/20" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2 flex flex-col overflow-hidden">
              {editingGroup ? (
                <>
                  <div className="p-4 border-b border-white/5 bg-white/5 flex gap-2">
                    <Input placeholder="Uusi tuote..." value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 h-10 text-xs" />
                    <Input placeholder="€/KG" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-24 bg-black/40 h-10 text-xs" />
                    <Button onClick={addProduct} className="copper-gradient px-4 h-10 font-black text-[10px] uppercase">LISÄÄ</Button>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {products.filter(p => p.groupId === editingGroup.id).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                          <div>
                            <p className="text-[11px] font-black uppercase text-foreground">{p.name}</p>
                            <p className="text-[10px] text-accent font-bold">{p.pricePerKg.toFixed(2)} €/KG</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground opacity-40 text-[10px] font-black uppercase tracking-widest">
                  Valitse ryhmä vasemmalta
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
