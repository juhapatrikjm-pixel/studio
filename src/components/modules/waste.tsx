
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trash2, 
  Scale, 
  Euro, 
  TrendingDown, 
  Plus, 
  Edit2, 
  Utensils, 
  History, 
  Sparkles,
  Save,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Calculator
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where } from "firebase/firestore"
import { format, startOfMonth, endOfMonth } from "date-fns"
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
  const monthlyRef = useMemo(() => (firestore ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [monthlyRef, currentMonthId])
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

    // Tallenna merkintä ja päivitä kuukausiyhteenveto
    setDoc(entryRef, entryData)
    
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
          <h2 className="text-4xl font-headline font-black copper-text-glow uppercase">Hävikkiseuranta</h2>
        </div>
        <p className="text-muted-foreground font-medium">Jokainen kirjattu gramma on euro kotiinpäin.</p>
      </header>

      {/* Keittiöapuri Info */}
      <Card className="industrial-card bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex gap-4">
          <div className="w-12 h-12 rounded-full copper-gradient flex items-center justify-center shrink-0 shadow-lg metal-shine-overlay">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2">
            <p className="font-headline font-bold text-accent">Moi! Olen keittiöapurisi.</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Valitse ensin tyyppi (**Prep** vai **Hävikki**), napauta tuotetta ja syötä paino. 
              Sovellus laskee hinnan automaattisesti. Alta löydät Top 3 -listan, joka kertoo mihin eurot valuvat juuri nyt.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Kirjaus-osio */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <Scale className="w-6 h-6" /> Kirjaa Hukka
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border-white/5 p-1 h-12">
                  <TabsTrigger value="prep" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent">
                    PREP (Kuoret tms.)
                  </TabsTrigger>
                  <TabsTrigger value="waste" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
                    HÄVIKKI (Turha)
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">VALITSE TUOTE</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold transition-all text-center uppercase tracking-tighter",
                        selectedProduct?.id === p.id 
                          ? "copper-gradient text-white border-accent shadow-lg scale-105" 
                          : "bg-white/5 border-white/10 text-muted-foreground hover:border-accent/40"
                      )}
                    >
                      {p.name}
                      <span className="block text-[8px] opacity-60 mt-1">{p.pricePerKg}€/kg</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="p-3 rounded-xl border border-dashed border-white/20 text-accent hover:bg-accent/5 flex items-center justify-center gap-2 text-xs font-black uppercase"
                  >
                    <Plus className="w-4 h-4" /> Uusi
                  </button>
                </div>

                {selectedProduct && (
                  <div className="pt-6 space-y-4 animate-in slide-in-from-bottom-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-accent tracking-widest">SYÖTÄ PAINO (KG)</Label>
                      <div className="relative">
                        <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="pl-12 h-14 bg-white/5 border-white/10 text-2xl font-black rounded-xl focus:border-accent/40"
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center shadow-inner">
                      <div>
                        <p className="text-[10px] uppercase font-black text-muted-foreground">Kustannus</p>
                        <p className="text-2xl font-black text-accent">{(Number(weight) * selectedProduct.pricePerKg).toFixed(2)} €</p>
                      </div>
                      <Button onClick={handleLogWaste} className="copper-gradient h-14 px-8 font-black uppercase text-xs tracking-widest shadow-2xl metal-shine-overlay">
                        TALLENNA
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kuukausiraportti */}
          <Card className="industrial-card">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <Calculator className="w-6 h-6" /> {currentMonthId} RAPORTTI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Turha Hävikki</p>
                  <p className="text-3xl font-black text-destructive tabular-nums">
                    {monthlyStats?.totalWasteCost?.toFixed(2) || "0.00"} €
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Prep-hukka</p>
                  <p className="text-3xl font-black text-amber-500 tabular-nums">
                    {monthlyStats?.totalPrepCost?.toFixed(2) || "0.00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">TOP 3 EUROHUKKA</Label>
                </div>
                <div className="space-y-2">
                  {top3.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 group">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full steel-detail flex items-center justify-center text-xs font-black text-black">#{i+1}</span>
                        <p className="font-bold text-sm uppercase">{item.name}</p>
                      </div>
                      <p className="font-black text-destructive">{item.cost.toFixed(2)} €</p>
                    </div>
                  ))}
                  {top3.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Ei kirjauksia tässä kuussa.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hallinta-osio */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="industrial-card">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-30" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-headline font-black text-accent uppercase">Hinnat & Tuotteet</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Hallitse kilo-hintoja</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingProduct(!isAddingProduct); setEditingProduct(null); }}>
                <Plus className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(isAddingProduct || editingProduct) && (
                <div className="p-4 rounded-xl bg-white/5 border border-accent/30 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Nimi</Label>
                      <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 border-white/10" placeholder="Esim. Tomaatti" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">€ / KG</Label>
                      <Input type="number" step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 border-white/10" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddProduct} className="flex-1 copper-gradient text-white font-black text-xs uppercase">Tallenna</Button>
                    <Button variant="outline" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="px-3"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-3">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-white/20 transition-all">
                      <div>
                        <p className="text-sm font-bold uppercase">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-black">{p.pricePerKg.toFixed(2)} €/kg</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4" /> Viimeisimmät kirjaukset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entries.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-1.5 h-8 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                      <div>
                        <p className="font-bold uppercase">{e.productName}</p>
                        <p className="text-[10px] text-muted-foreground">{e.weight}kg • {format(e.date?.toDate() || new Date(), 'HH:mm')}</p>
                      </div>
                    </div>
                    <p className="font-black text-accent">{e.cost.toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
