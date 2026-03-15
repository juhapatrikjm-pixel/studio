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
  Edit2, 
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

type WasteEntry = {
  id: string
  productId: string
  productName: string
  weight: number
  cost: number
  type: 'prep' | 'waste'
  date: any
  monthId: string
}

type MonthlyWaste = {
  id: string
  monthName: string
  totalWasteCost: number
  totalPrepCost: number
}

const DEFAULT_GROUPS = [
  { id: 'liha', name: 'Liha & Leikkele', index: 0 },
  { id: 'kala', name: 'Kala & Äyriäiset', index: 1 },
  { id: 'maito', name: 'Maito & Munat', index: 2 },
  { id: 'hevi', name: 'Hedelmät & Vihannekset', index: 3 },
  { id: 'juurekset', name: 'Juurekset & Sipulit', index: 4 },
  { id: 'leipomo', name: 'Leipomo & Vilja', index: 5 },
  { id: 'pakaste', name: 'Pakasteet', index: 6 },
  { id: 'kuiva', name: 'Kuiva & Mausteet', index: 7 },
]

const DEFAULT_PRODUCTS: Record<string, { name: string, price: number }[]> = {
  liha: [
    { name: 'Nauta Jauheliha', price: 12.50 }, { name: 'Naudan Ulkofilee', price: 34.90 }, { name: 'Porsaan Niska', price: 9.80 },
    { name: 'Porsaan Ulkofilee', price: 11.50 }, { name: 'Broilerin Rinta', price: 14.20 }, { name: 'Broilerin Koipi', price: 6.50 },
    { name: 'Pekoni', price: 12.90 }, { name: 'Kinkkuviipale', price: 13.50 }, { name: 'Salami', price: 18.00 },
    { name: 'Nauta Sisäpaisti', price: 22.00 }, { name: 'Karitsan Kare', price: 42.00 }, { name: 'Riista (Poro)', price: 48.00 },
    { name: 'Nakki/Makkara', price: 8.50 }, { name: 'Lehtipihvi', price: 28.00 }, { name: 'Naudan Maksa', price: 10.50 },
    { name: 'Broilerin Siivet', price: 7.20 }, { name: 'Kalkkuna', price: 15.00 }, { name: 'Naudan Rinta', price: 14.50 },
    { name: 'Ylikypsä Kylki', price: 16.00 }, { name: 'Chorizo', price: 19.00 }
  ],
  kala: [
    { name: 'Lohifilee', price: 24.50 }, { name: 'Kirjolohi', price: 19.00 }, { name: 'Siikafilee', price: 32.00 },
    { name: 'Kuhafilee', price: 38.00 }, { name: 'Ahvenfilee', price: 34.00 }, { name: 'Turska', price: 22.00 },
    { name: 'Katkarapu (iso)', price: 21.00 }, { name: 'Jättirapu', price: 28.00 }, { name: 'Savulohi', price: 29.50 },
    { name: 'Graavilohi', price: 32.00 }, { name: 'Simpukka', price: 14.00 }, { name: 'Mustekala', price: 18.00 },
    { name: 'Tonnikala (tuore)', price: 45.00 }, { name: 'Siianmäti', price: 120.00 }, { name: 'Kylmäsavulohi', price: 31.00 },
    { name: 'Kampasimpukka', price: 55.00 }, { name: 'Ravunpyrstö', price: 26.00 }, { name: 'Silli', price: 12.00 },
    { name: 'Muikku', price: 14.50 }, { name: 'Kampela', price: 19.00 }
  ],
  maito: [
    { name: 'Kuohukerma', price: 5.80 }, { name: 'Maito (luomu)', price: 1.40 }, { name: 'Voi', price: 9.50 },
    { name: 'Juustoraaste', price: 11.00 }, { name: 'Mozzarella', price: 14.00 }, { name: 'Cheddar', price: 16.00 },
    { name: 'Smetana', price: 7.50 }, { name: 'Ranskankerma', price: 6.80 }, { name: 'Turkkilainen Jogurtti', price: 4.20 },
    { name: 'Kananmuna (kg)', price: 4.50 }, { name: 'Parmesaani', price: 32.00 }, { name: 'Tuorejuusto', price: 12.00 },
    { name: 'Leipäjuusto', price: 18.00 }, { name: 'Halloumi', price: 19.50 }, { name: 'Fetajuusto', price: 15.00 },
    { name: 'Raejuusto', price: 8.50 }, { name: 'Kaurajuoma', price: 2.20 }, { name: 'Kaurakerma', price: 4.80 },
    { name: 'Sinihomejuusto', price: 22.00 }, { name: 'Vuohenjuusto', price: 24.00 }
  ],
  hevi: [
    { name: 'Jäävuorisalaatti', price: 4.50 }, { name: 'Kurkku', price: 3.20 }, { name: 'Tomaatti', price: 4.80 },
    { name: 'Paprika', price: 6.50 }, { name: 'Parsakaali', price: 5.80 }, { name: 'Kukkakaali', price: 4.20 },
    { name: 'Avokado', price: 9.50 }, { name: 'Sitruuna', price: 3.80 }, { name: 'Lime', price: 7.50 },
    { name: 'Omena', price: 2.80 }, { name: 'Banaani', price: 2.20 }, { name: 'Viinirypäle', price: 6.50 },
    { name: 'Vadelma (tuore)', price: 35.00 }, { name: 'Mustikka (tuore)', price: 28.00 }, { name: 'Tuoreyrtit (ruukku)', price: 2.50 },
    { name: 'Chili', price: 14.00 }, { name: 'Inkivääri', price: 8.50 }, { name: 'Ananas', price: 3.20 },
    { name: 'Meloni', price: 2.50 }, { name: 'Herneenverso', price: 12.00 }
  ],
  juurekset: [
    { name: 'Yleisperuna', price: 1.10 }, { name: 'Rosamunda', price: 1.40 }, { name: 'Porkkana', price: 1.20 },
    { name: 'Keltasipuli', price: 1.60 }, { name: 'Punasipuli', price: 2.20 }, { name: 'Valkosipuli', price: 8.50 },
    { name: 'Palsternakka', price: 3.20 }, { name: 'Punajuuri', price: 1.80 }, { name: 'Lanttu', price: 1.50 },
    { name: 'Selleri', price: 2.80 }, { name: 'Kevätsipuli', price: 9.50 }, { name: 'Purjo', price: 4.20 },
    { name: 'Salottisipuli', price: 5.50 }, { name: 'Bataatti', price: 3.80 }, { name: 'Piparjuuri', price: 18.00 },
    { name: 'Retikka', price: 2.50 }, { name: 'Nauris', price: 2.20 }, { name: 'Maa-artisokka', price: 9.00 },
    { name: 'Pikkusipuli', price: 4.50 }, { name: 'Valkosipulinkynnet (kuorittu)', price: 12.00 }
  ],
  leipomo: [
    { name: 'Vehnäjauho', price: 1.40 }, { name: 'Sokeri', price: 1.80 }, { name: 'Hiiva', price: 8.00 },
    { name: 'Sämpylä (pakaste)', price: 0.60 }, { name: 'Paahtoleipä', price: 4.50 }, { name: 'Hapanjuurileipä', price: 9.00 },
    { name: 'Croissant', price: 1.20 }, { name: 'Keksit', price: 12.00 }, { name: 'Suklaa (leipurin)', price: 18.00 },
    { name: 'Korppujauho', price: 4.20 }, { name: 'Ruisjauho', price: 1.60 }, { name: 'Mallas', price: 3.50 },
    { name: 'Tortilla', price: 6.50 }, { name: 'Pitaleipä', price: 5.80 }, { name: 'Lehtitaikina', price: 7.20 },
    { name: 'Munkki', price: 1.50 }, { name: 'Pulla', price: 1.20 }, { name: 'Kakkupohja', price: 14.00 },
    { name: 'Suolakeksi', price: 11.00 }, { name: 'Gluteeniton Leipä', price: 12.50 }
  ],
  pakaste: [
    { name: 'Pakasteherne', price: 4.20 }, { name: 'Pakastemaissi', price: 4.50 }, { name: 'Pakastemarjat (sekoitus)', price: 8.50 },
    { name: 'Ranskalaiset', price: 3.20 }, { name: 'Perunamuusi (pakaste)', price: 4.80 }, { name: 'Wokkivihannekset', price: 5.50 },
    { name: 'Pinaatti (pakaste)', price: 6.20 }, { name: 'Katkarapu (pakaste)', price: 16.50 }, { name: 'Mansikka (pakaste)', price: 9.00 },
    { name: 'Mustikka (pakaste)', price: 11.00 }, { name: 'Tyrni', price: 18.00 }, { name: 'Puolukka', price: 7.50 },
    { name: 'Mango (kuutio)', price: 8.20 }, { name: 'Sienet (pakaste)', price: 14.00 }, { name: 'Falafel (pakaste)', price: 12.00 },
    { name: 'Lihapulla (pakaste)', price: 9.50 }, { name: 'Kevätrulla', price: 11.00 }, { name: 'Jääpalat (kg)', price: 1.50 },
    { name: 'Sorbet', price: 14.00 }, { name: 'Jäätelö', price: 12.00 }
  ],
  kuiva: [
    { name: 'Rypsiöljy', price: 3.80 }, { name: 'Oliiviöljy', price: 12.50 }, { name: 'Suola (meri)', price: 1.20 },
    { name: 'Mustapippuri', price: 32.00 }, { name: 'Valkoviinietikka', price: 4.50 }, { name: 'Balsamico', price: 14.00 },
    { name: 'Soijakastike', price: 6.80 }, { name: 'Sinappi', price: 7.50 }, { name: 'Ketsuppi', price: 5.20 },
    { name: 'Majoneesi', price: 8.50 }, { name: 'Riisi (Basmati)', price: 3.20 }, { name: 'Pasta (Penne)', price: 2.80 },
    { name: 'Nuudeli', price: 4.50 }, { name: 'Kookosmaito', price: 4.20 }, { name: 'Tomaattipyre', price: 5.50 },
    { name: 'Hunaja', price: 14.00 }, { name: 'Pähkinät (sekoitus)', price: 22.00 }, { name: 'Kuivatut pavut', price: 4.80 },
    { name: 'Lihafondi', price: 12.00 }, { name: 'Kasvisliemi', price: 9.00 }
  ]
}

export function WasteModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [currentMonthId, setCurrentMonthId] = useState<string>("")
  const [isSeeding, setIsSeeding] = useState(false)
  
  useEffect(() => {
    setCurrentMonthId(format(new Date(), 'yyyy-MM'))
  }, [])

  const groupsRef = useMemo(() => (firestore ? collection(firestore, 'wasteGroups') : null), [firestore])
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore && currentMonthId ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const entriesRef = useMemo(() => (firestore ? collection(firestore, 'wasteEntries') : null), [firestore])

  const groupsQuery = useMemo(() => groupsRef ? query(groupsRef, orderBy('index', 'asc')) : null, [groupsRef])
  const { data: groups = [] } = useCollection<WasteGroup>(groupsQuery)
  const { data: products = [] } = useCollection<WasteProduct>(productsRef)
  const { data: monthlyStats } = useDoc<MonthlyWaste>(monthlyRef)
  
  const entriesQuery = useMemo(() => {
    if (!entriesRef || !currentMonthId) return null
    return query(entriesRef, where('monthId', '==', currentMonthId), orderBy('date', 'desc'), limit(10))
  }, [entriesRef, currentMonthId])
  
  const { data: entries = [] } = useCollection<WasteEntry>(entriesQuery)

  const [step, setStep] = useState<'group' | 'product' | 'weight' | 'confirm'>('group')
  const [activeType, setActiveType] = useState<'prep' | 'waste'>('waste')
  const [selectedGroup, setSelectedGroup] = useState<WasteGroup | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<WasteProduct | null>(null)
  const [weight, setWeight] = useState("")
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WasteGroup | null>(null)
  const [editingProduct, setEditingProduct] = useState<WasteProduct | null>(null)
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")

  const seedData = async () => {
    if (!firestore || !groupsRef || !productsRef) return
    setIsSeeding(true)
    try {
      const batch = writeBatch(firestore)
      
      // Seed Groups
      DEFAULT_GROUPS.forEach(g => {
        batch.set(doc(groupsRef, g.id), g)
      })

      // Seed Products
      Object.entries(DEFAULT_PRODUCTS).forEach(([groupId, items]) => {
        items.forEach(item => {
          const id = `${groupId}_${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
          batch.set(doc(productsRef, id), {
            id,
            groupId,
            name: item.name,
            pricePerKg: item.price
          })
        })
      })

      await batch.commit()
      toast({ title: "Tiedot alustettu", description: "Yli 160 tuotetta ladattu onnistuneesti." })
    } catch (e: any) {
      console.error("Seed error:", e)
      toast({ variant: "destructive", title: "Virhe alustuksessa", description: e.message || "Tarkista verkkoasetukset." })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleGroupSelect = (group: WasteGroup) => {
    setSelectedGroup(group)
    setStep('product')
  }

  const handleProductSelect = (product: WasteProduct) => {
    setSelectedProduct(product)
    setStep('weight')
  }

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setWeight("")
    } else if (val === ',') {
      if (!weight.includes(',')) setWeight(prev => prev + ',')
    } else {
      if (weight.length < 6) setWeight(prev => prev + val)
    }
  }

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
    const weightNum = Number(weight.replace(',', '.'))
    const costNum = weightNum * selectedProduct.pricePerKg

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
      toast({ variant: "destructive", title: "Virheellinen paino", description: result.error.errors[0].message })
      return
    }

    const entryId = Math.random().toString(36).substr(2, 9)
    const entryRef = doc(firestore, 'wasteEntries', entryId)
    
    setDoc(entryRef, {
      ...result.data,
      id: entryId,
      date: serverTimestamp()
    })
    
    setDoc(doc(firestore, 'monthlyWaste', currentMonthId), {
      id: currentMonthId,
      monthName: format(new Date(), 'MMMM yyyy', { locale: fi }),
      totalWasteCost: increment(activeType === 'waste' ? costNum : 0),
      totalPrepCost: increment(activeType === 'prep' ? costNum : 0)
    }, { merge: true })

    setStep('confirm')
    setTimeout(() => {
      resetProcess()
    }, 2000)
  }

  const resetProcess = () => {
    setStep('group')
    setSelectedGroup(null)
    setSelectedProduct(null)
    setWeight("")
  }

  const filteredProducts = products.filter(p => p.groupId === selectedGroup?.id)

  const saveProduct = () => {
    if (!editingGroup || !newProductName.trim() || !newProductPrice || !firestore) return
    const id = editingProduct?.id || Math.random().toString(36).substr(2, 9)
    setDoc(doc(firestore, 'wasteProducts', id), {
      id,
      groupId: editingGroup.id,
      name: newProductName,
      pricePerKg: Number(newProductPrice.replace(',', '.'))
    })
    setEditingProduct(null)
    setNewProductName("")
    setNewProductPrice("")
    toast({ title: "Tuote tallennettu" })
  }

  const deleteProduct = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'wasteProducts', id))
  }

  if (!currentMonthId) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Hävikki</h2>
          </div>
          <p className="text-muted-foreground text-[10px] font-black uppercase opacity-60 tracking-widest">Precision Loss Prevention</p>
        </div>
        <div className="flex gap-2">
          {groups.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedData} disabled={isSeeding} className="border-accent/40 text-accent hover:bg-accent/5 h-9 text-[10px] font-black uppercase">
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              ALUSTA TUOTTEET
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-9 px-4 text-[10px] font-black uppercase text-muted-foreground hover:text-accent border border-white/5"
          >
            <Settings2 className="w-4 h-4 mr-2" /> HALLINTA
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card overflow-hidden min-h-[600px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            
            <CardHeader className="bg-black/40 border-b border-white/5 p-4">
              <div className="flex flex-col gap-4">
                <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/60 border-white/10 p-1 h-12">
                    <TabsTrigger value="prep" className="text-[11px] font-black uppercase tracking-widest h-full transition-all data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">PREP-HUKKA</TabsTrigger>
                    <TabsTrigger value="waste" className="text-[11px] font-black uppercase tracking-widest h-full transition-all data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">HÄVIKKI</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {step !== 'group' && (
                      <Button variant="ghost" size="icon" onClick={() => setStep(step === 'weight' ? 'product' : 'group')} className="h-10 w-10 text-accent bg-white/5 border border-white/10">
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em]">
                        {step === 'group' ? 'VAIHE 1' : step === 'product' ? 'VAIHE 2' : 'VAIHE 3'}
                      </span>
                      <h3 className="font-headline font-black text-xl text-foreground uppercase tracking-tight">
                        {step === 'group' ? 'VALITSE RYHMÄ' : step === 'product' ? selectedGroup?.name : selectedProduct?.name}
                      </h3>
                    </div>
                  </div>
                  {selectedProduct && step === 'weight' && (
                    <div className="text-right bg-accent/10 p-2 px-4 rounded-xl border border-accent/20">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">YKSIKKÖHINTA</p>
                      <p className="text-sm font-black text-accent">{selectedProduct.pricePerKg.toFixed(2)} €/KG</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-6 flex flex-col">
              {step === 'group' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className="aspect-square rounded-3xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-4 transition-all hover:border-accent/40 hover:bg-accent/5 active:scale-95 shadow-xl group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-14 h-14 rounded-2xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
                        <Utensils className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-center px-3 group-hover:text-accent transition-colors relative z-10 leading-tight">{group.name}</span>
                    </button>
                  ))}
                  {groups.length === 0 && !isSeeding && (
                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                      <Loader2 className="w-10 h-10 animate-spin text-accent" />
                      <p className="text-xs font-black uppercase tracking-widest">Ladataan tuoteryhmiä...</p>
                    </div>
                  )}
                </div>
              )}

              {step === 'product' && (
                <ScrollArea className="h-[450px] pr-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-right-4 duration-300">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="h-24 rounded-2xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1.5 transition-all hover:border-accent/40 hover:bg-accent/5 active:scale-95 shadow-inner group"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-center px-3 leading-tight group-hover:text-foreground transition-colors">{product.name}</span>
                        <span className="text-[9px] text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{product.pricePerKg.toFixed(2)} €/KG</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full py-20 text-center text-muted-foreground italic text-sm">
                        Tässä ryhmässä ei ole vielä tuotteita.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {step === 'weight' && selectedProduct && (
                <div className="max-w-md mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="relative">
                    <div className="relative bg-black/60 border-2 border-white/10 rounded-[2.5rem] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 copper-gradient opacity-40" />
                      <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-[0.3em] mb-4">SYÖTETTY PAINO</p>
                      <div className="text-7xl font-black text-foreground tabular-nums tracking-tighter flex items-baseline justify-center">
                        {weight || "0,00"}<span className="text-2xl text-accent ml-3 font-headline">KG</span>
                      </div>
                      <div className="mt-6 flex items-center justify-center gap-3">
                        <Calculator className="w-5 h-5 text-accent/40" />
                        <span className="text-3xl font-black text-accent tabular-nums">
                          {(Number(weight.replace(',', '.')) * selectedProduct.pricePerKg).toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleKeypadPress(k.toString())}
                        className={cn(
                          "h-16 rounded-2xl text-2xl font-black transition-all active:scale-90 shadow-lg border-b-4",
                          k === 'C' 
                            ? "bg-destructive/20 text-destructive border-destructive/40 active:border-b-0 active:translate-y-1" 
                            : "bg-white/5 text-foreground border-white/10 hover:bg-white/10 active:border-b-0 active:translate-y-1"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleLogWaste}
                    disabled={!weight || Number(weight.replace(',', '.')) === 0}
                    className="w-full h-20 copper-gradient text-white font-black text-xl shadow-[0_10px_30px_rgba(184,115,51,0.3)] rounded-2xl metal-shine-overlay uppercase tracking-widest gap-4"
                  >
                    <Save className="w-7 h-7" /> KIRJAA HÄVIKKI
                  </Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-in zoom-in-95 duration-500 text-center">
                  <div className="w-32 h-32 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-headline font-black text-foreground uppercase tracking-tight">KIRJAUS ONNISTUI</h3>
                    <p className="text-muted-foreground text-lg font-medium">
                      {selectedProduct?.name}: <span className="text-accent font-black">{weight} kg</span> tallennettu lokiin.
                    </p>
                  </div>
                  <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 animate-[progress_2s_linear]" style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black text-accent flex items-center gap-2 uppercase tracking-[0.2em]">
                <Calculator className="w-4 h-4" /> KUUKAUSI: {monthlyStats?.monthName || currentMonthId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 relative overflow-hidden group transition-all hover:bg-destructive/10">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                  <p className="text-[10px] uppercase font-black text-destructive/60 mb-1 tracking-widest relative z-10">HÄVIKKI</p>
                  <p className="text-4xl font-black text-destructive tabular-nums relative z-10">
                    {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 relative overflow-hidden group transition-all hover:bg-amber-500/10">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                  <p className="text-[10px] uppercase font-black text-amber-500/60 mb-1 tracking-widest relative z-10">PREP-HUKKA</p>
                  <p className="text-4xl font-black text-amber-500 tabular-nums relative z-10">
                    {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">VIIMEISIMMÄT LOKIT</Label>
                  <span className="text-[9px] font-black text-accent/40 uppercase">AUTO-SYNC</span>
                </div>
                <div className="space-y-2">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 transition-all hover:border-accent/20 group">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1.5 h-8 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-tight text-foreground/90">{e.productName}</p>
                          <p className="text-[9px] text-muted-foreground font-bold">{e.weight} KG • {format(e.date?.toDate() || new Date(), 'd.M. HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-accent text-xs tabular-nums">{e.cost.toFixed(2)} €</p>
                        <p className="text-[8px] font-black text-muted-foreground/40 uppercase group-hover:text-destructive transition-colors cursor-pointer" onClick={() => deleteDoc(doc(firestore, 'wasteEntries', e.id))}>POISTA</p>
                      </div>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <div className="py-16 text-center flex flex-col items-center gap-3 border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                      <Utensils className="w-8 h-8" />
                      <p className="text-[10px] uppercase font-black tracking-widest">Ei merkintöjä tässä kuussa</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-3xl bg-background border-white/10 overflow-hidden flex flex-col p-0 h-[85vh]">
          <DialogHeader className="p-6 border-b border-white/5 bg-black/40">
            <DialogTitle className="text-2xl font-headline text-accent uppercase tracking-tight flex items-center gap-3">
              <Settings2 className="w-6 h-6" /> Tuotehallinta & Hinnasto
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 border-r border-white/5 bg-black/20 overflow-y-auto">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">VALITSE RYHMÄ</p>
              </div>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setEditingGroup(group); setEditingProduct(null); }}
                  className={cn(
                    "w-full p-4 text-left border-b border-white/5 transition-all text-[11px] uppercase font-bold tracking-widest group flex items-center justify-between",
                    editingGroup?.id === group.id ? "bg-primary/20 text-accent" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {group.name}
                  <ChevronRight className={cn("w-4 h-4 transition-transform", editingGroup?.id === group.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100")} />
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black/10">
              {editingGroup ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-accent">{editingGroup.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Hallitse tuotteita ja yksikköhintoja</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setEditingProduct(null); setNewProductName(""); setNewProductPrice(""); }} className="h-8 text-[9px] font-black uppercase border-accent/20 text-accent hover:bg-accent/5">LISÄÄ UUSI +</Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-accent/30 transition-all">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight text-foreground/90">{p.name}</p>
                            <p className="text-[10px] text-accent font-bold tabular-nums">{p.pricePerKg.toFixed(2)} €/KG</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:bg-accent/10" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 p-6 rounded-3xl bg-accent/5 border border-accent/20 space-y-5 shadow-2xl">
                      <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">{editingProduct ? 'MUOKKAA TUOTETTA' : 'UUSI TUOTE'}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Tuotenimi</Label>
                          <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 h-11 text-sm font-bold border-white/10" placeholder="Esim. Poro" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Hinta € / KG</Label>
                          <Input type="text" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 h-11 text-sm font-bold border-white/10" placeholder="0,00" />
                        </div>
                      </div>
                      <Button onClick={saveProduct} className="w-full copper-gradient text-white font-black text-xs uppercase h-12 tracking-widest shadow-lg metal-shine-overlay">
                        {editingProduct ? 'PÄIVITÄ TUOTE' : 'TALLENNA TUOTE'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 gap-6">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                    <Utensils className="w-10 h-10" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-[0.4em]">VALITSE RYHMÄ VASEMMALTA</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t border-white/5 bg-black/40">
            <Button onClick={() => setIsSettingsOpen(false)} className="steel-detail text-black font-black uppercase text-[10px] tracking-widest px-8 h-11 shadow-lg">SULJE HALLINTA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
