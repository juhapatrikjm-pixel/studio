"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ChefHat, 
  Utensils, 
  Plus, 
  Trash2, 
  Save, 
  Scale, 
  X,
  TrendingUp,
  Printer,
  Loader2,
  Thermometer,
  Clock,
  Pencil,
  FileText as FilePdf,
  Image as ImageIcon,
  Folder
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { calculateRecipe, calculateDish } from "@/lib/calculations"
import * as recipeService from "@/services/recipe-service"

type Ingredient = { id: string; name: string; weight: number; unit: 'g' | 'kg'; price: number; waste: number; }
type Step = { id: string; text: string; }
type RecipeEquipment = { id: string; name: string; temp: string; time: string; info: string; }
type SelectedRecipe = { id: string; recipeId: string; name: string; cost: number; weight: number; }
type FolderType = { id: string; name: string; type: 'recipe' | 'dish'; }

export function RecipesModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore])
  const dishesRef = useMemo(() => (firestore ? collection(firestore, 'dishes') : null), [firestore])
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'folders') : null), [firestore])
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])

  const { data: globalRecipes = [], loading: recipesLoading } = useCollection<any>(recipesRef)
  const { data: globalDishes = [], loading: dishesLoading } = useCollection<any>(dishesRef)
  const { data: folders = [] } = useCollection<FolderType>(foldersRef)
  const { data: settings } = useDoc<any>(settingsRef)

  const targetMargin = settings?.targetMargin || 75
  const [isSaving, setIsSaving] = useState(false)
  
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
  const [dishImageUrl, setDishImageUrl] = useState("")
  const [selectedDishFolderId, setSelectedDishFolderId] = useState<string>("root")
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([])
  const [dishIngredients, setDishIngredients] = useState<Ingredient[]>([])
  const [dishSteps, setDishSteps] = useState<Step[]>([])
  const [dishEquip, setDishEquip] = useState<RecipeEquipment[]>([])

  const recipeCalculations = useMemo(() => calculateRecipe(ingredients.map(ing => ({...ing, weight: ing.unit === 'g' ? (ing.weight || 0) / 1000 : (ing.weight || 0)})), portions), [ingredients, portions]);
  const dishCalculations = useMemo(() => calculateDish(selectedRecipes, dishIngredients.map(ing => ({...ing, weight: ing.unit === 'g' ? (ing.weight || 0) / 1000 : (ing.weight || 0)})), sellingPrice), [selectedRecipes, dishIngredients, sellingPrice]);

  const resetRecipeForm = () => { setRecipeName(""); setPortions(1); setSelectedFolderId("root"); setIngredients([]); setSteps([]); setRecipeEquip([]); setEditId(null); }
  const resetDishForm = () => { setDishName(""); setSellingPrice(0); setDishImageUrl(""); setSelectedDishFolderId("root"); setSelectedRecipes([]); setDishIngredients([]); setDishSteps([]); setDishEquip([]); setEditDishId(null); }

  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || !firestore) return
    setIsSaving(true)
    try {
      const id = editId || doc(collection(firestore, "recipes")).id
      const data = { id, name: recipeName, portions: Number(portions), folderId: selectedFolderId, ingredients, steps, equipment: recipeEquip, calculations: recipeCalculations }
      await recipeService.saveRecipe(firestore, data)
      toast({ title: "Resepti tallennettu" });
      setIsEditing(false); resetRecipeForm();
    } catch (e) { toast({ variant: "destructive", title: "Tallennus epäonnistui" }) } finally { setIsSaving(false) }
  }

  const handleSaveDish = async () => {
    if (!dishName.trim() || !firestore) return
    setIsSaving(true)
    try {
      const id = editDishId || doc(collection(firestore, "dishes")).id
      const data = { id, name: dishName, sellingPrice: Number(sellingPrice), imageUrl: dishImageUrl, folderId: selectedDishFolderId, recipes: selectedRecipes, manualIngredients: dishIngredients, steps: dishSteps, equipment: dishEquip, totalCost: dishCalculations.totalCost, totalWeight: dishCalculations.totalWeight, margin: dishCalculations.margin }
      await recipeService.saveDish(firestore, data)
      toast({ title: "Annos tallennettu" });
      setIsEditingDish(false); resetDishForm();
    } catch (e) { toast({ variant: "destructive", title: "Tallennus epäonnistui" }) } finally { setIsSaving(false) }
  }

  const handleEdit = (item: any, type: 'recipe' | 'dish') => {
    if (type === 'recipe') {
      setEditId(item.id);
      setRecipeName(item.name);
      setPortions(item.portions);
      setSelectedFolderId(item.folderId || "root");
      setIngredients(item.ingredients || []);
      setSteps(item.steps || []);
      setRecipeEquip(item.equipment || []);
      setIsEditing(true);
    } else {
      setEditDishId(item.id);
      setDishName(item.name);
      setSellingPrice(item.sellingPrice);
      setDishImageUrl(item.imageUrl || "");
      setSelectedDishFolderId(item.folderId || "root");
      setSelectedRecipes(item.recipes || []);
      setDishIngredients(item.manualIngredients || []);
      setDishSteps(item.steps || []);
      setDishEquip(item.equipment || []);
      setIsEditingDish(true);
    }
  }

  const handleDelete = async (id: string, type: 'recipe' | 'dish') => {
    if (!firestore || !window.confirm(`Haluatko varmasti poistaa tämän ${type === 'recipe' ? 'reseptin' : 'annoksen'}?`)) return;
    try {
      if (type === 'recipe') await recipeService.deleteRecipe(firestore, id);
      else await recipeService.deleteDish(firestore, id);
      toast({ title: "Poistettu" });
    } catch { toast({ variant: "destructive", title: "Poisto epäonnistui" }) }
  }

  const handlePrint = (item: any, type: 'recipe' | 'dish') => {
    handleEdit(item, type);
    setTimeout(() => window.print(), 500);
  }

  const handleIngredientChange = (id: string, field: keyof Ingredient, value: any) => setIngredients(ingredients.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleStepChange = (id: string, value: string) => setSteps(steps.map(s => s.id === id ? { ...s, text: value } : s));
  const handleEquipChange = (id: string, field: keyof RecipeEquipment, value: string) => setRecipeEquip(recipeEquip.map(e => e.id === id ? { ...e, [field]: value } : e));
  const handleDishIngredientChange = (id: string, field: keyof Ingredient, value: any) => setDishIngredients(dishIngredients.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleDishStepChange = (id: string, value: string) => setDishSteps(dishSteps.map(s => s.id === id ? { ...s, text: value } : s));
  const handleDishEquipChange = (id: string, field: keyof RecipeEquipment, value: string) => setDishEquip(dishEquip.map(e => e.id === id ? { ...e, [field]: value } : e));

  const recipeFolders = folders.filter(f => f.type === 'recipe');
  const dishFolders = folders.filter(f => f.type === 'dish');

  const renderListItem = (item: any, type: 'recipe' | 'dish') => (
    <Card key={item.id} className="p-4 flex justify-between items-center bg-card/50 border-border">
      <span className="font-bold">{item.name}</span>
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" onClick={() => handlePrint(item, type)}><FilePdf className="w-4 h-4 text-muted-foreground"/></Button>
        <Button size="icon" variant="ghost" onClick={() => handleEdit(item, type)}><Pencil className="w-4 h-4 text-muted-foreground"/></Button>
        <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id, type)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
      </div>
    </Card>
  )

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10 print:p-0">
      <header className="flex flex-col gap-1 no-print">
        <h2 className="text-3xl font-headline font-bold text-accent">Reseptiikka</h2>
        <p className="text-muted-foreground">Luo reseptejä, kokoa annoksia ja hallitse keittiön toimintaa.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
        <Card onClick={() => { resetRecipeForm(); setIsEditing(true); }} className="industrial-card cursor-pointer group">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Luo uusi resepti</CardTitle>
          </CardHeader>
        </Card>
        <Card onClick={() => { resetDishForm(); setIsEditingDish(true); }} className="industrial-card cursor-pointer group">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Utensils className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Luo uusi annos</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="no-print">
        <h3 className="text-xl font-headline text-accent mb-4">Reseptiarkisto</h3>
        {recipesLoading ? <Loader2 className="animate-spin"/> : globalRecipes.map(r => renderListItem(r, 'recipe'))}
      </div>

      <div className="no-print">
        <h3 className="text-xl font-headline text-accent mb-4">Annosarkisto</h3>
        {dishesLoading ? <Loader2 className="animate-spin"/> : globalDishes.map(d => renderListItem(d, 'dish'))}
      </div>

      {/* RESEPTI-EDITORIN DIALOGI */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) { resetRecipeForm(); setIsEditing(open); } else { setIsEditing(open); } }}>
        <DialogContent className="max-w-6xl h-[90vh] bg-background border-border overflow-hidden flex flex-col p-0 print-container">
          <DialogHeader className="p-6 border-b no-print">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-headline text-accent">{editId ? "Muokkaa reseptiä" : "Uusi resepti"}</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Tulosta</Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 print:overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
              <div className="lg:col-span-2 space-y-6">
                <Card className="print:border-black">
                  <CardHeader><CardTitle className="text-lg">Perustiedot</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reseptin nimi</Label>
                        <Input placeholder="Esim. Lohikeitto" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Saanto (annosta)</Label>
                        <Input placeholder="10" type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value) || 1)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Kansio</Label>
                      <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                        <SelectTrigger><SelectValue placeholder="Valitse kansio"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Pääkansio</SelectItem>
                          {recipeFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Ainesosat</CardTitle>
                    <Button onClick={() => setIngredients([...ingredients, { id: doc(collection(firestore!, 'recipes')).id, name: "", weight: 0, unit: 'g', price: 0, waste: 0 }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="flex flex-wrap gap-2 items-end p-2 rounded-lg border">
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Raaka-aine</Label><Input placeholder="Norjan lohi" value={ing.name} onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)} /></div>
                        <div className="w-24"><Label className="text-xs">Määrä</Label><Input placeholder="150" type="number" value={ing.weight} onChange={(e) => handleIngredientChange(ing.id, 'weight', Number(e.target.value))} /></div>
                        <div className="w-20"><Label className="text-xs">Yksikkö</Label><Select value={ing.unit} onValueChange={(v: 'g'|'kg') => handleIngredientChange(ing.id, 'unit', v)}><SelectTrigger/><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="kg">kg</SelectItem></SelectContent></Select></div>
                        <div className="w-24"><Label className="text-xs">Hinta (€/kg)</Label><Input placeholder="25.50" type="number" value={ing.price} onChange={(e) => handleIngredientChange(ing.id, 'price', Number(e.target.value))} /></div>
                        <div className="w-24"><Label className="text-xs">Hävikki %</Label><Input placeholder="15" type="number" value={ing.waste} onChange={(e) => handleIngredientChange(ing.id, 'waste', Number(e.target.value))} /></div>
                        <Button variant="ghost" size="icon" onClick={() => setIngredients(ingredients.filter(i => i.id !== ing.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Valmistusohjeet</CardTitle>
                    <Button onClick={() => setSteps([...steps, { id: doc(collection(firestore!, 'recipes')).id, text: "" }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-4">
                        <span className="font-bold text-accent pt-1">{index + 1}.</span>
                        <Textarea placeholder="Kuumenna voi..." value={step.text} onChange={(e) => handleStepChange(step.id, e.target.value)} rows={2} />
                        <Button variant="ghost" size="icon" onClick={() => setSteps(steps.filter(s => s.id !== step.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Laitteet</CardTitle>
                    <Button onClick={() => setRecipeEquip([...recipeEquip, { id: doc(collection(firestore!, 'recipes')).id, name: "", temp: "", time: "", info: "" }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {recipeEquip.map((equip) => (
                      <div key={equip.id} className="flex flex-wrap gap-2 items-end p-2 rounded-lg border">
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Laite</Label><Input placeholder="Rational-uuni" value={equip.name} onChange={(e) => handleEquipChange(equip.id, 'name', e.target.value)} /></div>
                        <div className="w-28"><Label className="text-xs flex items-center"><Thermometer className="w-3 mr-1"/>Lämpötila</Label><Input placeholder="180 °C" value={equip.temp} onChange={(e) => handleEquipChange(equip.id, 'temp', e.target.value)} /></div>
                        <div className="w-28"><Label className="text-xs flex items-center"><Clock className="w-3 mr-1"/>Aika</Label><Input placeholder="15 min" value={equip.time} onChange={(e) => handleEquipChange(equip.id, 'time', e.target.value)} /></div>
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Info</Label><Input placeholder="Höyryohjelma 2" value={equip.info} onChange={(e) => handleEquipChange(equip.id, 'info', e.target.value)} /></div>
                        <Button variant="ghost" size="icon" onClick={() => setRecipeEquip(recipeEquip.filter(e => e.id !== equip.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6 no-print">
                <Card className="sticky top-0">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Scale/>Talous</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between"><span className="text-sm">Nettopaino:</span><span className="font-bold">{recipeCalculations.totalNetWeight.toFixed(3)} kg</span></div>
                    <div className="flex justify-between"><span className="text-sm">Paino/annos:</span><span className="font-bold">{recipeCalculations.portionWeight.toFixed(3)} kg</span></div>
                    <div className="flex justify-between items-center text-lg"><span className="text-sm">Hinta/annos:</span><span className="font-bold text-accent">{recipeCalculations.portionCost.toFixed(2)} €</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex gap-3 pt-6 mt-6 border-t no-print">
              <Button onClick={handleSaveRecipe} className="flex-1" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin"/> : <Save/>} Tallenna</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Peruuta</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ANNOS-EDITORIN DIALOGI */}
      <Dialog open={isEditingDish} onOpenChange={(open) => { if (!open) { resetDishForm(); setIsEditingDish(open); } else { setIsEditingDish(open); } }}>
        <DialogContent className="max-w-6xl h-[90vh] bg-background border-border overflow-hidden flex flex-col p-0 print-container">
          <DialogHeader className="p-6 border-b no-print">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-headline text-accent">{editDishId ? "Muokkaa annosta" : "Uusi annos"}</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Tulosta</Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingDish(false)}><X className="w-5 h-5" /></Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 print:overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
              <div className="lg:col-span-2 space-y-6">
                <Card className="print:border-black">
                  <CardHeader><CardTitle className="text-lg">Myyntitiedot</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Annonksen nimi</Label>
                        <Input placeholder="Paahdettua lohta..." value={dishName} onChange={(e) => setDishName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Myyntihinta (€)</Label>
                        <Input placeholder="24.50" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Kansion</Label>
                      <Select value={selectedDishFolderId} onValueChange={setSelectedDishFolderId}>
                        <SelectTrigger><SelectValue placeholder="Valitse kansio"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Pääkansio</SelectItem>
                          {dishFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kuvan URL</Label>
                      <Input placeholder="https://..." value={dishImageUrl} onChange={(e) => setDishImageUrl(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Koostumus</CardTitle>
                    <Select onValueChange={(id) => { const r = globalRecipes.find(gr => gr.id === id); if (r) setSelectedRecipes([...selectedRecipes, { id: doc(collection(firestore!, 'dishes')).id, recipeId: r.id, name: r.name, cost: r.calculations.portionCost, weight: r.calculations.portionWeight }]);}}>
                      <SelectTrigger className="w-48 h-9 no-print"><SelectValue placeholder="Lisää resepti..." /></SelectTrigger>
                      <SelectContent>{globalRecipes.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {selectedRecipes.map((r) => (
                      <div key={r.id} className="flex justify-between items-center p-2 rounded-lg border">
                        <span className="font-semibold">{r.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRecipes(selectedRecipes.filter(sr => sr.id !== r.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Manuaaliset ainesosat</CardTitle>
                    <Button onClick={() => setDishIngredients([...dishIngredients, { id: doc(collection(firestore!, 'dishes')).id, name: "", weight: 0, unit: 'g', price: 0, waste: 0 }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {dishIngredients.map((ing) => (
                      <div key={ing.id} className="flex flex-wrap gap-2 items-end p-2 rounded-lg border">
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Raaka-aine</Label><Input placeholder="Sitruunalohko" value={ing.name} onChange={(e) => handleDishIngredientChange(ing.id, 'name', e.target.value)} /></div>
                        <div className="w-24"><Label className="text-xs">Määrä</Label><Input placeholder="20" type="number" value={ing.weight} onChange={(e) => handleDishIngredientChange(ing.id, 'weight', Number(e.target.value))} /></div>
                        <div className="w-20"><Label className="text-xs">Yksikkö</Label><Select value={ing.unit} onValueChange={(v: 'g'|'kg') => handleDishIngredientChange(ing.id, 'unit', v)}><SelectTrigger/><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="kg">kg</SelectItem></SelectContent></Select></div>
                        <div className="w-24"><Label className="text-xs">Hinta (€/kg)</Label><Input placeholder="3.50" type="number" value={ing.price} onChange={(e) => handleDishIngredientChange(ing.id, 'price', Number(e.target.value))} /></div>
                        <div className="w-24"><Label className="text-xs">Hävikki %</Label><Input placeholder="0" type="number" value={ing.waste} onChange={(e) => handleDishIngredientChange(ing.id, 'waste', Number(e.target.value))} /></div>
                        <Button variant="ghost" size="icon" onClick={() => setDishIngredients(dishIngredients.filter(i => i.id !== ing.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Valmistusohjeet (Annos)</CardTitle>
                    <Button onClick={() => setDishSteps([...dishSteps, { id: doc(collection(firestore!, 'dishes')).id, text: "" }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {dishSteps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-4">
                        <span className="font-bold text-accent pt-1">{index + 1}.</span>
                        <Textarea placeholder="Kokoa annos..." value={step.text} onChange={(e) => handleDishStepChange(step.id, e.target.value)} rows={2} />
                        <Button variant="ghost" size="icon" onClick={() => setDishSteps(dishSteps.filter(s => s.id !== step.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="print:border-black">
                  <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg">Laitteet (Annos)</CardTitle>
                    <Button onClick={() => setDishEquip([...dishEquip, { id: doc(collection(firestore!, 'dishes')).id, name: "", temp: "", time: "", info: "" }])} size="sm" variant="outline" className="gap-2 no-print"><Plus/> Lisää</Button>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {dishEquip.map((equip) => (
                      <div key={equip.id} className="flex flex-wrap gap-2 items-end p-2 rounded-lg border">
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Laite</Label><Input placeholder="Lämpölamppu" value={equip.name} onChange={(e) => handleDishEquipChange(equip.id, 'name', e.target.value)} /></div>
                        <div className="w-28"><Label className="text-xs flex items-center"><Thermometer className="w-3 mr-1"/>Lämpötila</Label><Input placeholder="60 °C" value={equip.temp} onChange={(e) => handleDishEquipChange(equip.id, 'temp', e.target.value)} /></div>
                        <div className="w-28"><Label className="text-xs flex items-center"><Clock className="w-3 mr-1"/>Aika</Label><Input placeholder="Tarjoiluun asti" value={equip.time} onChange={(e) => handleDishEquipChange(equip.id, 'time', e.target.value)} /></div>
                        <div className="flex-1 min-w-[150px]"><Label className="text-xs">Info</Label><Input placeholder="Pidä lämpimänä" value={equip.info} onChange={(e) => handleDishEquipChange(equip.id, 'info', e.target.value)} /></div>
                        <Button variant="ghost" size="icon" onClick={() => setDishEquip(dishEquip.filter(e => e.id !== equip.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {dishImageUrl && <img src={dishImageUrl} alt={dishName} className="mt-4 rounded-lg object-cover w-full aspect-video"/>}
              </div>
              <div className="space-y-6 no-print">
                <Card className="sticky top-0">
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp/>Kannattavuus</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between"><span className="text-sm">Kustannukset:</span><span className="font-bold">{dishCalculations.totalCost.toFixed(2)} €</span></div>
                    <div className={cn("flex justify-between items-center text-lg p-2 rounded-md", dishCalculations.margin >= targetMargin ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
                      <span className="text-sm uppercase">Kate:</span>
                      <span className="font-bold">{dishCalculations.margin.toFixed(1)} %</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex gap-3 pt-6 mt-6 border-t no-print">
              <Button onClick={handleSaveDish} className="flex-1" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin"/> : <Save/>} Tallenna</Button>
              <Button variant="outline" onClick={() => setIsEditingDish(false)}>Peruuta</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
