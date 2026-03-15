
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
  Trash2
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { wasteEntrySchema } from "@/lib/validations"

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

export function WasteModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [currentMonthId, setCurrentMonthId] = useState<string>("")
  
  useEffect(() => {
    setCurrentMonthId(format(new Date(), 'yyyy-MM'))
  }, [])

  const groupsRef = useMemo(() => (firestore ? collection(firestore, 'wasteGroups') : null), [firestore])
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore && currentMonthId ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const entriesRef = useMemo(() => (firestore ? collection(firestore, 'wasteEntries') : null), [firestore])

  const { data: groups = [] } = useCollection<WasteGroup>(groupsRef ? query(groupsRef, orderBy('index', 'asc')) : null)
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
      setWeight(prev => prev + val)
    }
  }

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
    const rawData = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      weight: weight,
      cost: Number(weight.replace(',', '.')) * selectedProduct.pricePerKg,
      type: activeType,
      monthId: currentMonthId,
      date: serverTimestamp()
    }

    // Validointi Zodilla
    const result = wasteEntrySchema.safeParse(rawData)

    if (!result.success) {
      toast({ 
        variant: "destructive", 
        title: "Virheellinen paino", 
        description: result.error.errors[0].message 
      })
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
      totalWasteCost: increment(activeType === 'waste' ? result.data.cost : 0),
      totalPrepCost: increment(activeType === 'prep' ? result.data.cost : 0)
    }, { merge: true })

    setStep('confirm')
    setTimeout(() => {
      resetProcess()
    }, 3000)
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
  }

  const deleteProduct = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'wasteProducts', id))
  }

  if (!currentMonthId) return null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Hävikki</h2>
          </div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase opacity-60">Precision Tracking System</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          className="h-9 px-4 text-[10px] font-black uppercase text-muted-foreground hover:text-accent border border-white/5"
        >
          <Settings2 className="w-4 h-4 mr-2" /> TUOTEHALLINTA
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card overflow-hidden min-h-[550px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            
            <CardHeader className="bg-black/40 border-b border-white/5 p-4">
              <div className="flex flex-col gap-4">
                <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/60 border-white/10 p-1 h-12">
                    <TabsTrigger value="prep" className="text-[11px] font-black uppercase tracking-widest h-full transition-all">PREP-HUKKA</TabsTrigger>
                    <TabsTrigger value="waste" className="text-[11px] font-black uppercase tracking-widest h-full transition-all">MYYNTIHÄVIKKI</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {step !== 'group' && (
                      <Button variant="ghost" size="icon" onClick={() => setStep(step === 'weight' ? 'product' : 'group')} className="h-10 w-10 text-accent bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                        {step === 'group' ? 'VAIHE 1' : step === 'product' ? 'VAIHE 2' : 'VAIHE 3'}
                      </span>
                      <h3 className="font-headline font-black text-xl text-foreground uppercase tracking-tight">
                        {step === 'group' ? 'VALITSE RYHMÄ' : selectedGroup?.name}
                      </h3>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="text-right bg-accent/10 p-2 rounded-lg border border-accent/20">
                      <p className="text-[11px] font-black text-accent uppercase tracking-tight">{selectedProduct.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">{selectedProduct.pricePerKg.toFixed(2)} €/KG</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-6 flex flex-col justify-center">
              {step === 'group' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className="aspect-square rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-3 transition-all hover:border-accent/40 hover:bg-accent/5 active:scale-95 shadow-xl group"
                    >
                      <div className="w-12 h-12 rounded-xl copper-gradient flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <Utensils className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-center px-2 group-hover:text-accent transition-colors">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'product' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-right-4 duration-300">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="aspect-square rounded-2xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-2 transition-all hover:border-accent/40 hover:bg-accent/5 active:scale-95 shadow-inner"
                    >
                      <span className="text-xs font-black uppercase tracking-widest text-center px-3 leading-tight">{product.name}</span>
                      <span className="text-[10px] text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-full">{product.pricePerKg.toFixed(2)} €/KG</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground italic">
                      Tässä ryhmässä ei ole vielä tuotteita.
                    </div>
                  )}
                </div>
              )}

              {step === 'weight' && selectedProduct && (
                <div className="max-w-sm mx-auto w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="relative">
                    <div className="relative bg-black/60 border border-white/10 rounded-3xl p-6 text-center shadow-2xl overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 copper-gradient opacity-20" />
                      <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-[0.2em] mb-3">PAINO (KG)</p>
                      <div className="text-6xl font-black text-foreground tabular-nums tracking-tighter">
                        {weight || "0,00"}<span className="text-xl text-accent ml-2">KG</span>
                      </div>
                      <p className="text-2xl font-black text-accent/60 tabular-nums mt-2">
                        {(Number(weight.replace(',', '.')) * selectedProduct.pricePerKg).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleKeypadPress(k.toString())}
                        className={cn(
                          "h-16 rounded-xl text-2xl font-black transition-all active:scale-90 shadow-lg border",
                          k === 'C' ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-white/5 text-foreground border-white/5 hover:bg-white/10"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleLogWaste}
                    disabled={!weight || Number(weight.replace(',', '.')) === 0}
                    className="w-full h-16 copper-gradient text-white font-black text-lg shadow-2xl rounded-2xl metal-shine-overlay uppercase tracking-widest"
                  >
                    <Save className="w-6 h-6 mr-3" /> KIRJAA HÄVIKKI
                  </Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500 text-center">
                  <div className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-headline font-black text-foreground uppercase tracking-tight">KIRJAUS VALMIS!</h3>
                    <p className="text-muted-foreground text-sm font-medium">
                      {selectedProduct?.name}: <span className="text-accent font-black">{weight}kg</span> tallennettu lokiin.
                    </p>
                  </div>
                  <Button onClick={resetProcess} variant="outline" size="lg" className="px-8 border-white/10 uppercase font-black tracking-widest">UUSI KIRJAUS</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-xs font-headline font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="w-5 h-5" /> {monthlyStats?.monthName || currentMonthId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-1 tracking-widest">KOKONAISHÄVIKKI</p>
                  <p className="text-3xl font-black text-destructive tabular-nums">
                    {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-1 tracking-widest">PREP-HUKKA</p>
                  <p className="text-3xl font-black text-amber-500 tabular-nums">
                    {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">TUOREIMMAT KIRJAUKSET</Label>
                <div className="space-y-2">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 transition-all hover:border-accent/20">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1 h-8 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-foreground/90">{e.productName}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{e.weight}KG • {format(e.date?.toDate() || new Date(), 'd.M. HH:mm')}</p>
                        </div>
                      </div>
                      <p className="font-black text-accent text-sm tabular-nums">{e.cost.toFixed(2)} €</p>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <div className="py-10 text-center text-[10px] uppercase font-black text-muted-foreground/40 border-2 border-dashed border-white/5 rounded-2xl">
                      Ei merkintöjä tässä kuussa
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl bg-background border-border overflow-hidden flex flex-col p-0 h-[80vh]">
          <DialogHeader className="p-6 border-b border-white/5 bg-card">
            <DialogTitle className="text-2xl font-headline text-accent uppercase tracking-tight flex items-center gap-3">
              <Settings2 className="w-6 h-6" /> TUOTEHALLINTA
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="w-56 border-r border-white/5 bg-black/20 overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setEditingGroup(group); setEditingProduct(null); }}
                  className={cn(
                    "w-full p-4 text-left border-b border-white/5 transition-all text-[11px] uppercase tracking-widest",
                    editingGroup?.id === group.id ? "bg-primary/20 text-accent font-black" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {group.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {editingGroup ? (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent">{editingGroup.name} TUOTTEET</h4>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingProduct(null); setNewProductName(""); setNewProductPrice(""); }} className="h-8 text-[10px] font-black hover:text-accent">LISÄÄ UUSI +</Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{p.name}</p>
                            <p className="text-[10px] text-accent font-bold">{p.pricePerKg.toFixed(2)} €/KG</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-6 rounded-2xl bg-accent/5 border border-accent/20 space-y-4">
                      <p className="text-[10px] font-black uppercase text-accent tracking-widest">{editingProduct ? 'MUOKKAA TUOTETTA' : 'LISÄÄ UUSI TUOTE'}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tuotenimi</Label>
                          <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 h-10 text-sm font-bold" placeholder="Esim. Poro" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hinta € / KG</Label>
                          <Input type="text" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 h-10 text-sm font-bold" placeholder="0,00" />
                        </div>
                      </div>
                      <Button onClick={saveProduct} className="w-full copper-gradient text-white font-black text-xs uppercase h-10 tracking-widest">TALLENNA TUOTE</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
                  <Utensils className="w-16 h-16" />
                  <p className="text-xs uppercase font-black tracking-[0.3em]">VALITSE RYHMÄ VASEMMALTA</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t border-white/5 bg-card">
            <Button onClick={() => setIsSettingsOpen(false)} className="steel-detail text-black font-black uppercase text-[10px] tracking-widest px-8 h-10">SULJE HALLINTA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
