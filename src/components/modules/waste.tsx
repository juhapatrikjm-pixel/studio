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
  TrendingDown, 
  Plus, 
  Edit2, 
  Utensils, 
  History, 
  Save,
  X,
  ArrowLeft,
  ChevronRight,
  Calculator,
  CheckCircle2,
  Settings2
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, increment, where } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
  const [newGroupName, setNewGroupName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")

  useEffect(() => {
    if (firestore && groups.length === 0) {
      const defaultGroups = [
        "Juurekset & Sipulit", "Vihannekset & Salaatit", "Hedelmät & Marjat", 
        "Liha & Leikkeleet", "Kala & Merenelävät", "Meijeri & Munat", 
        "Vilja & Leipomo", "Valmiit komponentit"
      ]
      defaultGroups.forEach((name, i) => {
        const id = `group-${i + 1}`
        setDoc(doc(firestore, 'wasteGroups', id), { id, name, index: i })
      })
    }
  }, [firestore, groups.length])

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
      if (!weight.includes('.')) setWeight(prev => prev + '.')
    } else {
      setWeight(prev => prev + val)
    }
  }

  const handleLogWaste = () => {
    if (!selectedProduct || !weight || !firestore || !currentMonthId) return
    
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

    setDoc(entryRef, entryData)
    
    setDoc(doc(firestore, 'monthlyWaste', currentMonthId), {
      id: currentMonthId,
      monthName: format(new Date(), 'MMMM yyyy', { locale: fi }),
      totalWasteCost: increment(activeType === 'waste' ? cost : 0),
      totalPrepCost: increment(activeType === 'prep' ? cost : 0)
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

  const saveGroupName = () => {
    if (!editingGroup || !newGroupName.trim() || !firestore) return
    setDoc(doc(firestore, 'wasteGroups', editingGroup.id), { name: newGroupName }, { merge: true })
    setEditingGroup(null)
    setNewGroupName("")
  }

  const saveProduct = () => {
    if (!editingGroup || !newProductName.trim() || !newProductPrice || !firestore) return
    const id = editingProduct?.id || Math.random().toString(36).substr(2, 9)
    setDoc(doc(firestore, 'wasteProducts', id), {
      id,
      groupId: editingGroup.id,
      name: newProductName,
      pricePerKg: Number(newProductPrice)
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
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-headline font-black copper-text-glow uppercase tracking-tighter">Hävikki</h2>
          </div>
          <p className="text-muted-foreground text-[8px] font-medium italic uppercase opacity-60">Klik-Klik-Punnitse System</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          className="h-8 text-[8px] font-black uppercase text-muted-foreground hover:text-accent"
        >
          <Settings2 className="w-3 h-3 mr-1" /> HALLINTA
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <Card className="industrial-card overflow-hidden min-h-[500px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            
            <CardHeader className="bg-black/40 border-b border-white/5 p-2">
              <div className="flex flex-col gap-2">
                <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/60 border-white/10 p-0.5 h-10">
                    <TabsTrigger value="prep" className="text-[9px] font-black uppercase tracking-widest h-full transition-all">PREP</TabsTrigger>
                    <TabsTrigger value="waste" className="text-[9px] font-black uppercase tracking-widest h-full transition-all">HÄVIKKI</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {step !== 'group' && (
                      <Button variant="ghost" size="icon" onClick={() => setStep(step === 'weight' ? 'product' : 'group')} className="h-7 w-7 text-accent">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">
                        {step === 'group' ? 'VAIHE 1' : step === 'product' ? 'VAIHE 2' : 'VAIHE 3'}
                      </span>
                      <h3 className="font-headline font-black text-sm text-foreground uppercase">
                        {step === 'group' ? 'Ryhmät' : selectedGroup?.name}
                      </h3>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-accent uppercase">{selectedProduct.name}</p>
                      <p className="text-[7px] text-muted-foreground font-bold">{selectedProduct.pricePerKg.toFixed(2)} €/KG</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 flex flex-col justify-center">
              {step === 'group' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in zoom-in-95 duration-300">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className="aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 transition-all hover:border-accent/40 active:scale-95 shadow-md group"
                    >
                      <div className="w-8 h-8 rounded-lg copper-gradient flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                        <Utensils className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-center px-1 group-hover:text-accent transition-colors">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'product' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-right-4 duration-300">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="aspect-square rounded-xl border border-white/5 bg-black/40 flex flex-col items-center justify-center gap-1 transition-all hover:border-accent/40 active:scale-95 shadow-inner"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">{product.name}</span>
                      <span className="text-[8px] text-accent font-bold">{product.pricePerKg.toFixed(2)} €/KG</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 'weight' && selectedProduct && (
                <div className="max-w-xs mx-auto w-full space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="relative">
                    <div className="relative bg-black/60 border border-white/10 rounded-2xl p-4 text-center shadow-2xl">
                      <p className="text-[8px] uppercase font-black text-muted-foreground/60 tracking-widest mb-2">KG</p>
                      <div className="text-4xl font-black text-foreground tabular-nums tracking-tighter">
                        {weight || "0.00"}<span className="text-sm text-accent ml-1">KG</span>
                      </div>
                      <p className="text-lg font-black text-accent/60 tabular-nums">
                        {(Number(weight) * selectedProduct.pricePerKg).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleKeypadPress(k.toString())}
                        className={cn(
                          "h-12 rounded-lg text-lg font-black transition-all active:scale-90",
                          k === 'C' ? "bg-destructive/20 text-destructive border border-destructive/30" : "bg-white/5 text-foreground border border-white/5"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleLogWaste}
                    disabled={!weight || Number(weight) === 0}
                    className="w-full h-14 copper-gradient text-white font-black text-sm shadow-xl rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-2" /> TALLENNA
                  </Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-500 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-black text-foreground uppercase">Tallennettu!</h3>
                    <p className="text-muted-foreground text-[10px] mt-1 font-medium">
                      {selectedProduct?.name}: {weight}kg
                    </p>
                  </div>
                  <Button onClick={resetProcess} variant="outline" size="sm" className="h-8 text-[9px] border-white/10 uppercase font-black">Uusi kirjaus</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5 p-3">
              <CardTitle className="text-xs font-headline font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="w-4 h-4" /> {monthlyStats?.monthName || currentMonthId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[7px] uppercase font-black text-muted-foreground/60 mb-0.5 tracking-widest">HÄVIKKI</p>
                  <p className="text-xl font-black text-destructive tabular-nums">
                    {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[7px] uppercase font-black text-muted-foreground/60 mb-0.5 tracking-widest">PREP-HUKKA</p>
                  <p className="text-xl font-black text-amber-500 tabular-nums">
                    {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">LOKI</Label>
                <div className="space-y-1">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-0.5 h-6 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-tight text-foreground/90">{e.productName}</p>
                          <p className="text-[7px] text-muted-foreground font-medium">{e.weight}KG • {format(e.date?.toDate() || new Date(), 'd.M. HH:mm')}</p>
                        </div>
                      </div>
                      <p className="font-black text-accent text-[10px] tabular-nums">{e.cost.toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl bg-background border-border overflow-hidden flex flex-col p-0 h-[70vh]">
          <DialogHeader className="p-4 border-b border-white/5 bg-card">
            <DialogTitle className="text-lg font-headline text-accent uppercase tracking-tight flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> TUOTEHALLINTA
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="w-48 border-r border-white/5 bg-black/20 overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setEditingGroup(group); setEditingProduct(null); }}
                  className={cn(
                    "w-full p-3 text-left border-b border-white/5 transition-all text-[9px] uppercase tracking-widest",
                    editingGroup?.id === group.id ? "bg-primary/20 text-accent font-black" : "text-muted-foreground"
                  )}
                >
                  {group.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {editingGroup ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-accent">{editingGroup.name} TUOTTEET</h4>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingProduct(null); setNewProductName(""); setNewProductPrice(""); }} className="h-6 text-[8px] font-black">UUSI +</Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                          <div>
                            <p className="text-[10px] font-black uppercase">{p.name}</p>
                            <p className="text-[8px] text-accent font-bold">{p.pricePerKg.toFixed(2)} €/KG</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-accent" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                      <p className="text-[8px] font-black uppercase text-accent tracking-widest">{editingProduct ? 'MUOKKAA' : 'LISÄÄ TUOTE'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold text-muted-foreground">NIMI</Label>
                          <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 h-8 text-[10px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold text-muted-foreground">€ / KG</Label>
                          <Input type="number" step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 h-8 text-[10px]" />
                        </div>
                      </div>
                      <Button onClick={saveProduct} className="w-full copper-gradient text-white font-black text-[9px] uppercase h-8">TALLENNA</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-2">
                  <Utensils className="w-10 h-10" />
                  <p className="text-[9px] uppercase font-black tracking-widest">VALITSE RYHMÄ</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-3 border-t border-white/5 bg-card">
            <Button onClick={() => setIsSettingsOpen(false)} className="steel-detail text-black font-black uppercase text-[9px] tracking-widest px-6 h-8">SULJE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
