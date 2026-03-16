"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ChefHat, 
  Utensils, 
  Plus, 
  Trash2, 
  Save, 
  Scale, 
  Folder,
  X,
  TrendingUp,
  Printer,
  Share2,
  Edit2,
  Search
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { calculateRecipe, calculateDish } from "@/lib/calculations"

type Ingredient = {
  id: string
  name: string
  weight: number
  price: number
  waste: number
}

type Step = {
  id: string
  text: string
}

type RecipeEquipment = {
  id: string
  equipmentId: string
  name: string
  temp: string
  time: string
  info: string
}

type SelectedRecipe = {
  id: string
  recipeId: string
  name: string
  cost: number
  weight: number
}

export function RecipesModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'archiveFolders') : null), [firestore])
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore])
  const dishesRef = useMemo(() => (firestore ? collection(firestore, 'dishes') : null), [firestore])
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])

  const { data: folders = [] } = useCollection<any>(foldersRef)
  const { data: globalRecipes = [] } = useCollection<any>(recipesRef)
  const { data: globalDishes = [] } = useCollection<any>(dishesRef)
  const { data: settings } = useDoc<any>(settingsRef)

  const targetMargin = settings?.targetMargin || 75

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'recipes' | 'dishes'>('recipes')

  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [recipeName, setRecipeName] = useState("")
  const [portions, setPortions] = useState(1)
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [recipeEquip, setRecipeEquip] = useState<RecipeEquipment[]>([])

  const [isEditingDish, setIsEditingDish] = useState(false)
  const [editDishId, setEditDishId] = useState<string | null>(null)
  const [dishName, setDishName] = useState("")
  const [sellingPrice, setSellingPrice] = useState(0)
  const [selectedDishFolderId, setSelectedDishFolderId] = useState<string>("root")
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([])
  const [dishIngredients, setDishIngredients] = useState<Ingredient[]>([])
  const [dishSteps, setDishSteps] = useState<Step[]>([])
  const [dishEquip, setDishEquip] = useState<RecipeEquipment[]>([])

  const recipeFolders = folders.filter(f => f.category === 'recipes')
  const dishFolders = folders.filter(f => f.category === 'dishes')

  // KÄYTETÄÄN PALVELUKERROSTA LASKENTAAN
  const recipeCalculations = useMemo(() => calculateRecipe(ingredients, portions), [ingredients, portions])
  const dishCalculations = useMemo(() => calculateDish(selectedRecipes, dishIngredients, sellingPrice), [selectedRecipes, dishIngredients, sellingPrice])

  const resetRecipeForm = () => {
    setRecipeName(""); setPortions(1); setSelectedFolderId("root");
    setIngredients([]); setSteps([]); setRecipeEquip([]); setEditId(null);
  }

  const resetDishForm = () => {
    setDishName(""); setSellingPrice(0); setSelectedDishFolderId("root");
    setSelectedRecipes([]); setDishIngredients([]); setDishSteps([]); setDishEquip([]); setEditDishId(null);
  }

  const handleSaveRecipe = () => {
    if (!recipeName.trim() || !firestore) return
    const id = editId || Math.random().toString(36).substr(2, 9)
    const data = {
      id, name: recipeName, portions: Number(portions),
      folderId: selectedFolderId === "root" ? null : selectedFolderId,
      ingredients, steps, equipment: recipeEquip,
      calculations: recipeCalculations,
      createdAt: editId ? (globalRecipes.find(r => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    }
    setDoc(doc(firestore, 'recipes', id), data, { merge: true });
    toast({ title: "Resepti tallennettu" });
    setIsEditing(false); resetRecipeForm();
  }

  const handleSaveDish = () => {
    if (!dishName.trim() || !firestore) return
    const id = editDishId || Math.random().toString(36).substr(2, 9)
    const data = {
      id, name: dishName, sellingPrice: Number(sellingPrice),
      folderId: selectedDishFolderId === "root" ? null : selectedDishFolderId,
      recipes: selectedRecipes, manualIngredients: dishIngredients,
      steps: dishSteps, equipment: dishEquip,
      totalCost: dishCalculations.totalCost, totalWeight: dishCalculations.totalWeight,
      margin: dishCalculations.margin,
      createdAt: editDishId ? (globalDishes.find(d => d.id === editDishId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    }
    setDoc(doc(firestore, 'dishes', id), data, { merge: true });
    toast({ title: "Annos tallennettu" });
    setIsEditingDish(false); resetDishForm();
  }

  const startEditRecipe = (r: any) => {
    setEditId(r.id); setRecipeName(r.name); setPortions(r.portions);
    setSelectedFolderId(r.folderId || "root"); setIngredients(r.ingredients || []);
    setSteps(r.steps || []); setRecipeEquip(r.equipment || []); setIsEditing(true);
  }

  const startEditDish = (d: any) => {
    setEditDishId(d.id); setDishName(d.name); setSellingPrice(d.sellingPrice);
    setSelectedDishFolderId(d.folderId || "root"); setSelectedRecipes(d.recipes || []);
    setDishIngredients(d.manualIngredients || []); setDishSteps(d.steps || []);
    setDishEquip(d.equipment || []); setIsEditingDish(true);
  }

  const filteredItems = useMemo(() => {
    const list = activeTab === 'recipes' ? globalRecipes : globalDishes;
    return list.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [activeTab, globalRecipes, globalDishes, searchTerm]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 print:p-0">
      <header className="flex flex-col gap-1 no-print">
        <h2 className="text-3xl font-headline font-bold text-accent">Reseptiikka</h2>
        <p className="text-muted-foreground">Hallitse keittiön reseptejä ja kokoa niistä kannattavia annoksia.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
        <Card onClick={() => { resetRecipeForm(); setIsEditing(true); }} className="industrial-card cursor-pointer group hover:border-accent/40 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Aloita Resepti</CardTitle>
            <CardDescription className="text-sm">Luo uusi komponentti ja arkistoi se kansioon.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full copper-gradient text-white font-bold gap-2"><Plus className="w-4 h-4" /> Avaa editori</Button></CardContent>
        </Card>

        <Card onClick={() => { resetDishForm(); setIsEditingDish(true); }} className="industrial-card cursor-pointer group hover:border-accent/40 transition-all">
          <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Utensils className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Uusi Annos</CardTitle>
            <CardDescription className="text-sm">Yhdistä reseptejä ja raaka-aineita kokonaiseksi annokseksi.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full steel-detail text-background font-bold gap-2"><Plus className="w-4 h-4" /> Kokoa annos</Button></CardContent>
        </Card>
      </div>

      <div className="no-print mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 bg-muted/30 p-1 rounded-lg border border-border">
            <Button variant={activeTab === 'recipes' ? 'default' : 'ghost'} onClick={() => setActiveTab('recipes')} className={cn(activeTab === 'recipes' && "copper-gradient")}>Reseptit</Button>
            <Button variant={activeTab === 'dishes' ? 'default' : 'ghost'} onClick={() => setActiveTab('dishes')} className={cn(activeTab === 'dishes' && "steel-detail")}>Annokset</Button>
          </div>
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Etsi tallennettuja..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-muted/30 border-border" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="bg-card border-border hover:border-accent/40 transition-all group overflow-hidden">
               <div className={cn("h-1 w-full", activeTab === 'recipes' ? "copper-gradient" : "steel-detail")} />
               <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-muted/50">
                      {activeTab === 'recipes' ? <ChefHat className="w-4 h-4 text-accent" /> : <Utensils className="w-4 h-4 text-accent" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{activeTab === 'recipes' ? `${item.portions} annosta` : `${item.sellingPrice} €`}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => activeTab === 'recipes' ? startEditRecipe(item) : startEditDish(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(firestore, activeTab === 'recipes' ? 'recipes' : 'dishes', item.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* RESEPTI POPUP */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) resetRecipeForm(); setIsEditing(open); }}>
        <DialogContent className="max-w-6xl h-[90vh] bg-background border-border overflow-hidden flex flex-col p-0 print-container">
          <DialogHeader className="p-6 border-b border-border bg-card no-print">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-headline text-accent">{editId ? "Muokkaa reseptiä" : "Uusi resepti"}</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Tulosta</Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 print:overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4 print:block">
              <div className="lg:col-span-2 space-y-8 print:space-y-4">
                <Card className="bg-card border-border shadow-xl print:border-black">
                  <CardHeader><CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Yleiskatsaus</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reseptin nimi</Label>
                        <Input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} className="bg-muted/30 border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label>Saanto (annosta)</Label>
                        <Input type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value))} className="bg-muted/30 border-border" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-xl print:border-black">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Ainesosat</CardTitle>
                    <Button onClick={() => setIngredients([...ingredients, { id: Date.now().toString(), name: "", weight: 0, price: 0, waste: 0 }])} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent no-print"><Plus className="w-4 h-4" /> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-lg border border-border bg-white/5 group">
                        <div className="md:col-span-4 space-y-1"><Input value={ing.name} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, name: e.target.value} : i))} className="h-8 text-xs" /></div>
                        <div className="md:col-span-2 space-y-1"><Input type="number" value={ing.weight} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, weight: Number(e.target.value)} : i))} className="h-8 text-xs" /></div>
                        <div className="md:col-span-2 space-y-1"><Input type="number" value={ing.price} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, price: Number(e.target.value)} : i))} className="h-8 text-xs" /></div>
                        <div className="md:col-span-2 space-y-1"><Input type="number" value={ing.waste} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, waste: Number(e.target.value)} : i))} className="h-8 text-xs" /></div>
                        <div className="md:col-span-2 flex justify-end"><Button variant="ghost" size="icon" onClick={() => setIngredients(ingredients.filter(i => i.id !== ing.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 no-print">
                <Card className="industrial-card sticky top-0">
                  <div className="absolute top-0 right-0 w-1 h-full copper-gradient" />
                  <CardHeader><CardTitle className="text-sm font-headline uppercase text-accent flex items-center gap-2"><Scale className="w-4 h-4" /> Talous</CardTitle></CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-xs text-muted-foreground font-bold">Nettopaino:</span><span className="font-mono font-bold text-accent">{recipeCalculations.totalNetWeight.toFixed(3)} kg</span></div>
                    <div className="pt-4 space-y-4 bg-accent/5 p-4 rounded-xl border border-accent/10">
                      <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground font-bold">Paino / Annos:</span><span className="font-headline font-bold">{recipeCalculations.portionWeight.toFixed(3)} kg</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground font-bold">Kustannus / Annos:</span><span className="font-headline font-bold text-2xl text-accent">{recipeCalculations.portionCost.toFixed(2)} €</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex gap-3 pt-6 pb-12 mt-6 border-t border-border no-print">
              <Button onClick={handleSaveRecipe} className="flex-1 copper-gradient text-white font-bold h-12 gap-2"><Save className="w-5 h-5" /> Tallenna</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 border-border">Peruuta</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ANNOS POPUP */}
      <Dialog open={isEditingDish} onOpenChange={(open) => { if (!open) resetDishForm(); setIsEditingDish(open); }}>
        <DialogContent className="max-w-6xl h-[90vh] bg-background border-border overflow-hidden flex flex-col p-0 print-container">
          <DialogHeader className="p-6 border-b border-border bg-card no-print">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-headline text-accent">Annoskortti</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingDish(false)}><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 print:overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4 print:block">
              <div className="lg:col-span-2 space-y-8">
                <Card className="bg-card border-border shadow-xl">
                  <CardHeader><CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Myynti</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nimi</Label><Input value={dishName} onChange={(e) => setDishName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hinta (€)</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} /></div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Koostumus</CardTitle>
                    <Select onValueChange={(id) => {
                      const r = globalRecipes.find(gr => gr.id === id);
                      if (r) setSelectedRecipes([...selectedRecipes, { id: Date.now().toString(), recipeId: r.id, name: r.name, cost: r.calculations.portionCost, weight: r.calculations.portionWeight }]);
                    }}>
                      <SelectTrigger className="w-[200px] h-8 text-xs bg-muted/30"><SelectValue placeholder="Lisää resepti..." /></SelectTrigger>
                      <SelectContent>{globalRecipes.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {selectedRecipes.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5">
                        <span className="text-sm font-bold">{r.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRecipes(selectedRecipes.filter(sr => sr.id !== r.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 no-print">
                <Card className="industrial-card sticky top-0">
                  <div className="absolute top-0 right-0 w-1 h-full steel-detail" />
                  <CardHeader className="bg-primary/5 border-b border-border"><CardTitle className="text-sm font-headline uppercase text-accent flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Kannattavuus</CardTitle></CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-xs text-muted-foreground font-bold">Kustannukset:</span><span className="font-mono font-bold text-accent">{dishCalculations.totalCost.toFixed(2)} €</span></div>
                    <div className={cn("pt-4 space-y-4 p-4 rounded-xl border", dishCalculations.margin >= targetMargin ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30")}>
                      <div className="flex justify-between items-center"><span className="text-xs font-bold uppercase">Kate:</span><span className={cn("font-headline font-bold text-2xl", dishCalculations.margin >= targetMargin ? "text-green-500" : "text-destructive")}>{dishCalculations.margin.toFixed(1)} %</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex gap-3 pt-6 pb-12 mt-6 border-t border-border no-print">
              <Button onClick={handleSaveDish} className="flex-1 steel-detail text-background font-bold h-12 gap-2"><Save className="w-5 h-5" /> Tallenna</Button>
              <Button variant="outline" onClick={() => setIsEditingDish(false)} className="h-12 border-border">Peruuta</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
