
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
  const currentMonthId = format(new Date(), 'yyyy-MM')

  // Firestore Refs
  const groupsRef = useMemo(() => (firestore ? collection(firestore, 'wasteGroups') : null), [firestore])
  const productsRef = useMemo(() => (firestore ? collection(firestore, 'wasteProducts') : null), [firestore])
  const monthlyRef = useMemo(() => (firestore ? doc(firestore, 'monthlyWaste', currentMonthId) : null), [firestore, currentMonthId])
  const entriesRef = useMemo(() => (firestore ? collection(firestore, 'wasteEntries') : null), [firestore])

  const { data: groups = [] } = useCollection<WasteGroup>(groupsRef ? query(groupsRef, orderBy('index', 'asc')) : null)
  const { data: products = [] } = useCollection<WasteProduct>(productsRef)
  const { data: monthlyStats } = useDoc<MonthlyWaste>(monthlyRef)
  const { data: entries = [] } = useCollection<WasteEntry>(entriesRef ? query(entriesRef, where('monthId', '==', currentMonthId), orderBy('date', 'desc'), limit(10)) : null)

  // Navigation State: "Klik-Klik-Punnitse"
  const [step, setStep] = useState<'group' | 'product' | 'weight' | 'confirm'>('group')
  const [activeType, setActiveType] = useState<'prep' | 'waste'>('waste')
  const [selectedGroup, setSelectedGroup] = useState<WasteGroup | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<WasteProduct | null>(null)
  const [weight, setWeight] = useState("")
  
  // Management State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WasteGroup | null>(null)
  const [editingProduct, setEditingProduct] = useState<WasteProduct | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")

  // Pre-seed groups if none exist (8 groups)
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

  // Management functions
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

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-accent" />
            <h2 className="text-4xl font-headline font-black copper-text-glow uppercase tracking-tight">Hävikkiseuranta</h2>
          </div>
          <p className="text-muted-foreground font-medium italic">Klik-Klik-Punnitse: Keittiön tehokkain hävikkityökalu.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsSettingsOpen(true)}
          className="border-white/10 bg-white/5 text-muted-foreground hover:text-accent hover:border-accent/40"
        >
          <Settings2 className="w-4 h-4 mr-2" /> Hallitse tuotteita
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pääpaneeli: Kirjaus */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card overflow-hidden min-h-[650px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            
            <CardHeader className="bg-black/40 border-b border-white/5">
              <div className="flex flex-col gap-4">
                <Tabs value={activeType} onValueChange={(v: any) => setActiveType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/60 border-white/10 p-1 h-16">
                    <TabsTrigger value="prep" className="gap-2 font-black uppercase text-xs tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent border-none h-full transition-all">
                      [ PREP ]
                    </TabsTrigger>
                    <TabsTrigger value="waste" className="gap-2 font-black uppercase text-xs tracking-widest data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive border-none h-full transition-all">
                      [ HÄVIKKI ]
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    {step !== 'group' && (
                      <Button variant="ghost" size="icon" onClick={() => setStep(step === 'weight' ? 'product' : 'group')} className="text-accent">
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                        {step === 'group' ? '1. Valitse pääryhmä' : step === 'product' ? '2. Valitse tuote' : step === 'weight' ? '3. Syötä paino' : 'Valmis'}
                      </span>
                      <h3 className="font-headline font-black text-xl text-foreground">
                        {step === 'group' ? 'Pääryhmät' : selectedGroup?.name}
                      </h3>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="text-right">
                      <p className="text-xs font-black text-accent uppercase tracking-tighter">{selectedProduct.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">{selectedProduct.pricePerKg.toFixed(2)} €/kg</p>
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
                      className="aspect-square rounded-2xl border-2 border-white/5 bg-white/5 flex flex-col items-center justify-center gap-3 transition-all hover:border-accent/40 hover:bg-white/10 group active:scale-95 shadow-lg"
                    >
                      <div className="w-12 h-12 rounded-xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay opacity-60 group-hover:opacity-100 transition-opacity">
                        <Utensils className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-center px-2 group-hover:text-accent transition-colors">{group.name}</span>
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
                      className="aspect-square rounded-2xl border-2 border-white/5 bg-black/40 flex flex-col items-center justify-center gap-2 transition-all hover:border-accent/40 hover:bg-white/5 active:scale-95 shadow-inner"
                    >
                      <span className="text-sm font-black uppercase tracking-widest text-center px-4">{product.name}</span>
                      <span className="text-[10px] text-accent font-bold">{product.pricePerKg.toFixed(2)} €/kg</span>
                    </button>
                  ))}
                  {filteredProducts.length < 8 && (
                    <div className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center opacity-30 italic text-[10px] uppercase font-black tracking-widest text-center px-4">
                      Lisää tuotteita hallinnan kautta
                    </div>
                  )}
                </div>
              )}

              {step === 'weight' && selectedProduct && (
                <div className="max-w-md mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full" />
                    <div className="relative bg-black/60 border-2 border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                      <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.3em] mb-4">PUNNITUS (KG)</p>
                      <div className="text-6xl font-black text-foreground tabular-nums tracking-tighter mb-2">
                        {weight || "0.00"}<span className="text-2xl text-accent ml-2">KG</span>
                      </div>
                      <p className="text-xl font-black text-accent/60 tabular-nums">
                        {(Number(weight) * selectedProduct.pricePerKg).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ',', 0, 'C'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleKeypadPress(k.toString())}
                        className={cn(
                          "h-16 rounded-xl text-2xl font-black transition-all active:scale-90 shadow-md",
                          k === 'C' ? "bg-destructive/20 text-destructive border border-destructive/30" : "bg-white/5 text-foreground border border-white/10 hover:bg-white/10"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleLogWaste}
                    disabled={!weight || Number(weight) === 0}
                    className="w-full h-20 copper-gradient text-white font-black text-xl shadow-2xl metal-shine-overlay rounded-2xl hover:scale-[1.02] transition-transform"
                  >
                    <Save className="w-6 h-6 mr-3" /> TALLENNA KIRJAUS
                  </Button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500 text-center">
                  <div className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-headline font-black text-foreground uppercase tracking-tight">Kirjattu!</h3>
                    <p className="text-muted-foreground mt-2 font-medium">
                      {selectedProduct?.name}: {weight}kg = {(Number(weight) * (selectedProduct?.pricePerKg || 0)).toFixed(2)}€
                    </p>
                  </div>
                  <Button onClick={resetProcess} variant="outline" className="mt-4 border-white/10">Uusi kirjaus</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Oikea Paneeli: Raportit ja Historia */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="industrial-card">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3 uppercase tracking-widest">
                <Calculator className="w-6 h-6" /> {monthlyStats?.monthName || currentMonthId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-1 tracking-widest">TURHA HÄVIKKI</p>
                  <p className="text-3xl font-black text-destructive tabular-nums tracking-tighter">
                    {monthlyStats?.totalWasteCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <p className="text-[10px] uppercase font-black text-muted-foreground/60 mb-1 tracking-widest">PREP-HUKKA</p>
                  <p className="text-3xl font-black text-amber-500 tabular-nums tracking-tighter">
                    {monthlyStats?.totalPrepCost?.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) || "0,00"} €
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">VIIMEISIMMÄT</Label>
                <div className="space-y-2">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1 h-8 rounded-full", e.type === 'waste' ? "bg-destructive" : "bg-amber-500")} />
                        <div>
                          <p className="font-black uppercase tracking-widest text-foreground/90">{e.productName}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">{e.weight}kg • {format(e.date?.toDate() || new Date(), 'd.M. HH:mm')}</p>
                        </div>
                      </div>
                      <p className="font-black text-accent text-sm tabular-nums">{e.cost.toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hallinta Dialogi */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-4xl bg-background border-border overflow-hidden flex flex-col p-0 h-[80vh]">
          <DialogHeader className="p-6 border-b border-white/5 bg-card">
            <DialogTitle className="text-2xl font-headline text-accent uppercase tracking-tight flex items-center gap-3">
              <Settings2 className="w-6 h-6" /> Tuotehallinta (8x8 Malli)
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            {/* Ryhmät sivupalkki */}
            <div className="w-64 border-r border-white/5 bg-black/20 overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setEditingGroup(group); setEditingProduct(null); }}
                  className={cn(
                    "w-full p-4 text-left border-b border-white/5 transition-all flex items-center justify-between group",
                    editingGroup?.id === group.id ? "bg-primary/20 text-accent font-black" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <span className="text-xs uppercase tracking-widest truncate">{group.name}</span>
                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Tuotehallinta sisältö */}
            <div className="flex-1 overflow-y-auto p-6">
              {editingGroup ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-end gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Muokkaa pääryhmän nimeä</Label>
                      <Input 
                        placeholder={editingGroup.name}
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="bg-black/40 border-white/10 h-12 font-bold"
                      />
                    </div>
                    <Button onClick={saveGroupName} className="copper-gradient h-12 px-6 font-black uppercase text-[10px]">Päivitä nimi</Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-sm font-black uppercase tracking-widest text-accent">Ryhmän tuotteet ({filteredProducts.length}/8)</h4>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { setEditingProduct(null); setNewProductName(""); setNewProductPrice(""); }}
                        className="h-8 border-white/10 text-[10px] font-black"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Uusi tuote
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group">
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">{p.name}</p>
                            <p className="text-[10px] text-accent font-bold">{p.pricePerKg.toFixed(2)} €/kg</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.pricePerKg.toString()); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(editingProduct || (filteredProducts.length < 8 && !editingProduct)) && (
                      <div className="mt-6 p-6 rounded-2xl bg-accent/5 border border-accent/20 space-y-4">
                        <p className="text-[10px] font-black uppercase text-accent tracking-widest">{editingProduct ? 'Muokkaa tuotetta' : 'Lisää uusi tuote ryhmään'}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Tuotteen nimi</Label>
                            <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-black/40 border-white/10 h-10 text-xs font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Hinta € / KG</Label>
                            <Input type="number" step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-black/40 border-white/10 h-10 text-xs font-bold" />
                          </div>
                        </div>
                        <Button onClick={saveProduct} className="w-full copper-gradient text-white font-black text-[10px] uppercase h-10">Tallenna tuotetiedot</Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
                  <Utensils className="w-16 h-16" />
                  <p className="text-xs uppercase font-black tracking-widest">Valitse ryhmä muokataksesi tuotteita</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t border-white/5 bg-card">
            <Button onClick={() => setIsSettingsOpen(false)} className="steel-detail text-black font-black uppercase text-[10px] tracking-widest px-8">Sulje hallinta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
