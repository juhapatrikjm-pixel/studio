
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trash2, 
  Scale, 
  TrendingDown, 
  Plus, 
  Edit2, 
  Utensils, 
  History, 
  Save,
  X,
  ArrowDownRight,
  Calculator
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type WasteProduct = {
  id: string
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

export function WasteModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const currentMonthId = format(new Date(), 'yyyy-MM')
  
  // Viitteet
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const entriesRef = useMemo(() => (firestore ? collection(firestore, 'wasteEntries') : null), [firestore])
  
  const entriesQuery = useMemo(() => {
    if (!entriesRef) return null
    return query(entriesRef, where('monthId', '==', currentMonthId), orderBy('date', 'desc'), limit(50))
  }, [entriesRef, currentMonthId])

  // Data
  const { data: products = [] } = useCollection<WasteProduct>(productsRef)
  const { data: monthlyStats } = useDoc<MonthlyWaste>(monthlyRef)
  const { data: entries = [] } = useCollection<WasteEntry>(entriesQuery)

  // Tila
  const [activeType, setActiveType] = useState<'prep' | 'waste'>('waste')
  const [selectedProduct, setSelectedProduct] = useState<WasteProduct | null>(null)
  const [weight, setWeight] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<WasteProduct | null>(null)

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore) return
    
    const weightNum = Number(weight)
    const cost = weightNum * selectedProduct.pricePerKg
    const entryId = Math.random().toString(36).substr(2, 9)
    const entryRef = doc(firestore, 'wasteEntries', entryId)
    
    const entryData = {
      id: entryId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      weight: weightNum,
      cost: cost,
      type: activeType,
      date: serverTimestamp(),
      monthId: currentMonthId
    }

    // Tallenna merkintä
    setDoc(entryRef, entryData)
    
    // Päivitä kuukausiyhteenveto
    setDoc(doc(firestore, 'monthlyWaste', currentMonthId), {
      id: currentMonthId,
      monthName: format(new Date(), 'MMMM yyyy', { locale: fi }),
      totalWasteCost: increment(activeType === 'waste' ? cost : 0),
      totalPrepCost: increment(activeType === 'prep' ? cost : 0)
    }, { merge: true })

    toast({
      title: "Kirjaus tallennettu",
      description: `${selectedProduct.name}: ${weightNum}kg (${cost.toFixed(2)}€)`,
    })

    setWeight("")
    setSelectedProduct(null)
  }

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductPrice || !firestore) return
    
    const id = editingProduct?.id || Math.random().toString(36).substr(2, 9)
    const prodRef = doc(firestore, 'wasteProducts', id)
    
    setDoc(prodRef, {
      id,
      name: newProductName,
      pricePerKg: Number(newProductPrice)
    })

    toast({ title: editingProduct ? "Tuote päivitetty" : "Tuote lisätty" })
    setNewProductName("")
    setNewProductPrice("")
    setIsAddingProduct(false)
    setEditingProduct(null)
  }

  const deleteProduct = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'wasteProducts', id))
  }

  const top3 = useMemo(() => {
    const counts: Record<string, { cost: number, name: string }> = {}
    entries.forEach(e => {
      if (e.type === 'waste') {
        if (!counts[e.productName]) counts[e.productName] = { cost: 0, name: e.productName }
        counts[e.productName].cost += e.cost
      }
    })
    return Object.values(counts).sort((a, b) => b.cost - a.cost).slice(0, 3)
  }, [entries])

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-accent" />
          <h2 className="text-4xl font-headline font-black copper-text-glow uppercase tracking-tight">Hävikkiseuranta</h2>
        </div>
        <p className="text-muted-foreground font-medium italic">Jokainen kirjattu gramma on euro kotiinpäin.</p>
      </header>

      {/* Keittiöapuri Info - Metallinen kortti */}
      <Card className="industrial-card bg-primary/5 border-primary/20 animate-breathing">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient opacity-50" />
        <CardContent className="p-6 flex gap-6 items-center">
          <div className="w-16 h-16 rounded-2xl copper-gradient flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(184,115,51,0.4)] metal-shine-overlay border border-white/10">
            <Utensils className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <div className="space-y-1">
            <p className="font-headline font-black text-xl text-accent uppercase tracking-wider">Moi! Olen keittiöapurisi.</p>
            <p className="text-sm text-foreground/80 leading-relaxed font-medium">
              Valitse tyyppi, napauta tuotetta ja syötä paino. Sovellus laskee hinnan automaattisesti. 
              Seuraa alta <span className="text-accent font-bold">Top 3 Eurohukka</span> -listaa säästääksesi kuluissa.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Kirjaus-osio */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="industrial-card overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <Scale className="w-6 h-6" /> KIRJAA HUKKA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 border-white/5 p-1 h-14">
                  <TabsTrigger value="prep" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent border-none h-full transition-all">
                    PREP (Kuoret tms.)
                  </TabsTrigger>
                  <TabsTrigger value="waste" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive border-none h-full transition-all">
                    HÄVIKKI (Turha)
                  </TabsTrigger>
                </TabsList>
              

                <div className="space-y-6">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-4 block">1. VALITSE TUOTE</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className={cn(
                          "p-4 rounded-xl border text-xs font-black transition-all text-center uppercase tracking-widest group relative overflow-hidden h-20 flex flex-col items-center justify-center",
                          selectedProduct?.id === p.id 
                            ? "copper-gradient text-white border-accent shadow-[0_0_15px_rgba(184,115,51,0.4)] scale-[1.02] metal-shine-overlay" 
                            : "bg-white/5 border-white/10 text-muted-foreground hover:border-accent/40 hover:bg-white/10"
                        )}
                      >
                        <span className="relative z-10">{p.name}</span>
                        <span className={cn(
                          "block text-[8px] mt-1 font-bold opacity-60",
                          selectedProduct?.id === p.id ? "text-white" : "text-accent"
                        )}>{p.pricePerKg.toFixed(2)}€/kg</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => setIsAddingProduct(true)}
                      className="p-4 rounded-xl border border-dashed border-white/20 text-accent hover:bg-accent/5 flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all h-20"
                    >
                      <Plus className="w-5 h-5" /> LISÄÄ UUSI
                    </button>
                  </div>

                  {selectedProduct && (
                    <div className="pt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-black text-accent tracking-[0.2em]">2. SYÖTÄ PAINO (KG)</Label>
                        <div className="relative group">
                          <Calculator className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-accent transition-colors" />
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="pl-14 h-16 bg-black/40 border-white/10 text-3xl font-black rounded-2xl focus:border-accent/40 transition-all tabular-nums"
                          />
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-black/60 border border-white/5 flex justify-between items-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-30" />
                        <div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">ARVIOITU KUSTANNUS</p>
                          <p className="text-4xl font-black text-accent tabular-nums drop-shadow-[0_0_10px_rgba(184,115,51,0.3)]">
                            {(Number(weight) * selectedProduct.pricePerKg).toFixed(2)} <span className="text-xl">€</span>
                          </p>
                        </div>
                        <Button onClick={handleLogWaste} className="copper-gradient h-16 px-10 font-black uppercase text-xs tracking-[0.2em] shadow-2xl metal-shine-overlay rounded-xl hover:scale-105 transition-transform active:scale-95">
                          <Save className="w-5 h-5 mr-2" /> TALLENNA
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Kuukausiraportti */}
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3 uppercase tracking-widest">
                <Calculator className="w-6 h-6" /> {monthlyStats?.monthName || currentMonthId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10 pt-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-destructive opacity-40 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-2 tracking-widest">TURHA HÄVIKKI</p>
                  <p className="text-4xl font-black text-destructive tabular-nums tracking-tighter">
                    {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-2 tracking-widest">PREP-HUKKA</p>
                  <p className="text-4xl font-black text-amber-500 tabular-nums tracking-tighter">
                    {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">TOP 3 EUROHUKKA TÄSSÄ KUUSSA</Label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {top3.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/5 group hover:border-white/10 transition-all shadow-inner">
                      <div className="flex items-center gap-5">
                        <span className="w-10 h-10 rounded-xl steel-detail flex items-center justify-center text-xs font-black text-black shadow-lg">#{i+1}</span>
                        <p className="font-black text-sm uppercase tracking-widest text-foreground/90">{item.name}</p>
                      </div>
                      <p className="font-black text-xl text-destructive tabular-nums">{item.cost.toFixed(2)} €</p>
                    </div>
                  ))}
                  {top3.length === 0 && (
                    <div className="py-12 text-center flex flex-col items-center gap-3 opacity-30">
                      <Scale className="w-10 h-10 text-muted-foreground" />
                      <p className="text-xs font-black uppercase tracking-widest">Ei kirjauksia tässä kuussa</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hallinta-osio */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="industrial-card">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-30" />
            <CardHeader className="flex flex-row items-center justify-between bg-black/20 border-b border-white/5">
              <div>
                <CardTitle className="text-lg font-headline font-black text-accent uppercase tracking-widest">HINNAT & TUOTTEET</CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Hallitse kilo-hintoja</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="text-accent hover:bg-accent/10 rounded-full" onClick={() => { setIsAddingProduct(!isAddingProduct); setEditingProduct(null); }}>
                <Plus className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {(isAddingProduct || editingProduct) && (
                <div className="p-5 rounded-2xl bg-white/5 border border-accent/30 space-y-5 animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">TUOTTEEN NIMI</Label>
                      <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 border-white/10 h-11 text-xs font-bold" placeholder="Esim. Tomaatti" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">€ / KG</Label>
                      <Input type="number" step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 border-white/10 h-11 text-xs font-bold" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleAddProduct} className="flex-1 copper-gradient text-white font-black text-[10px] uppercase tracking-widest h-11 shadow-lg">TALLENNA TUOTE</Button>
                    <Button variant="outline" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="px-4 border-white/10 text-muted-foreground"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[450px]">
                <div className="space-y-2 pr-4">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-white/20 hover:bg-white/10 transition-all shadow-inner">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-foreground/90">{p.name}</p>
                        <p className="text-[10px] text-accent font-black mt-0.5">{p.pricePerKg.toFixed(2)} €/kg</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-accent hover:bg-accent/10 rounded-lg" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                      <Utensils className="w-12 h-12 text-muted-foreground" />
                      <p className="text-xs font-black uppercase tracking-widest">Ei tuotteita listalla</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-3">
                <History className="w-4 h-4" /> VIIMEISIMMÄT KIRJAUKSET
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {entries.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 text-xs group hover:bg-black/40 transition-colors shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-1.5 h-10 rounded-full shadow-lg", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                      <div>
                        <p className="font-black uppercase tracking-widest text-foreground/90">{e.productName}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{e.weight}kg • {format(e.date?.toDate() || new Date(), 'HH:mm')}</p>
                      </div>
                    </div>
                    <p className="font-black text-accent text-lg tabular-nums">{e.cost.toFixed(2)} €</p>
                  </div>
                ))}
                {entries.length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Ei kirjauksia tänään</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
