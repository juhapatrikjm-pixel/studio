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
  FilePdf,
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
type Folder = { id: string; name: string; type: 'recipe' | 'dish'; }

export function RecipesModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore])
  const dishesRef = useMemo(() => (firestore ? collection(firestore, 'dishes') : null), [firestore])
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'folders') : null), [firestore])
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])

  const { data: globalRecipes = [], loading: recipesLoading } = useCollection<any>(recipesRef)
  const { data: globalDishes = [], loading: dishesLoading } = useCollection<any>(dishesRef)
  const { data: folders = [] } = useCollection<Folder>(foldersRef)
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
      toast({ title: "Resepti tallennettu", description: `Resepti "${recipeName}" on tallennettu.` });
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
      toast({ title: "Annos tallennettu", description: `Annos "${dishName}" on tallennettu.` });
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

  const handleDelete = async (id: string, name: string, type: 'recipe' | 'dish') => {
    if (!firestore || !window.confirm(`Haluatko varmasti poistaa: "${name}"?`)) return;
    try {
      if (type === 'recipe') await recipeService.deleteRecipe(firestore, id);
      else await recipeService.deleteDish(firestore, id);
      toast({ title: `"${name}" poistettu` });
    } catch { toast({ variant: "destructive", title: "Poisto epäonnistui" }) }
  }

  const handlePrint = (item: any, type: 'recipe' | 'dish') => {
    handleEdit(item, type);
    setTimeout(() => {
      const printContainer = document.querySelector(".print-container");
      if(printContainer) {
        // Logic to make only the dialog content printable
        document.body.classList.add("printing");
        printContainer.classList.add("printing-content");
        window.print();
        document.body.classList.remove("printing");
        printContainer.classList.remove("printing-content");
      }
    }, 500);
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
    <Card key={item.id} className="industrial-card flex justify-between items-center p-3 transition-all hover:border-accent/50">
      <span className="font-bold text-foreground text-sm truncate pl-2">{item.name}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => handlePrint(item, type)} className="hover:bg-accent/10"><FilePdf className="w-4 h-4 text-accent"/></Button>
        <Button size="icon" variant="ghost" onClick={() => handleEdit(item, type)} className="hover:bg-secondary/50"><Pencil className="w-4 h-4 text-muted-foreground"/></Button>
        <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id, item.name, type)} className="hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive"/></Button>
      </div>
    </Card>
  )

  const dialogContentClass = "max-w-4xl h-[95vh] bg-background/80 backdrop-blur-3xl border-border overflow-hidden flex flex-col p-0 print-container";
  const inputClass = "bg-black/20 border-white/10 h-9 text-sm";
  const labelClass = "text-xs font-bold text-muted-foreground uppercase tracking-wider";

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      <header className="no-print">
        <h2 className="text-4xl font-headline font-bold text-transparent bg-clip-text copper-gradient">Reseptiikka</h2>
        <p className="text-muted-foreground mt-1">Luo reseptejä, kokoa annoksia ja hallitse kannattavuutta.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <Card onClick={() => { resetRecipeForm(); setIsEditing(true); }} className="industrial-card cursor-pointer group hover:border-primary/50 transition-all">
          <div className="highlight-bar copper-gradient left-0"/>
          <CardHeader><div className="w-10 h-10 mb-3 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20"><ChefHat className="w-6 h-6 text-primary" /></div><CardTitle className="text-xl font-headline">Luo uusi resepti</CardTitle><CardDescription className="text-sm text-muted-foreground">Rakenna komponentti raaka-aineista.</CardDescription></CardHeader>
        </Card>
        <Card onClick={() => { resetDishForm(); setIsEditingDish(true); }} className="industrial-card cursor-pointer group hover:border-secondary-foreground/20 transition-all">
          <div className="highlight-bar steel-gradient right-0"/>
          <CardHeader><div className="w-10 h-10 mb-3 rounded-lg bg-secondary/20 flex items-center justify-center border border-secondary/30"><Utensils className="w-6 h-6 text-secondary-foreground" /></div><CardTitle className="text-xl font-headline">Luo uusi annos</CardTitle><CardDescription className="text-sm text-muted-foreground">Kokoa myyntituote resepteistä.</CardDescription></CardHeader>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-10 no-print">
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Folder className="w-5 h-5"/> Reseptiarkisto</h3>
          <div className="space-y-2">{recipesLoading ? <Loader2 className="animate-spin mt-4"/> : globalRecipes.map(r => renderListItem(r, 'recipe'))}</div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-secondary-foreground mb-4 flex items-center gap-2"><Folder className="w-5 h-5"/> Annosarkisto</h3>
          <div className="space-y-2">{dishesLoading ? <Loader2 className="animate-spin mt-4"/> : globalDishes.map(d => renderListItem(d, 'dish'))}</div>
        </div>
      </div>

      {/* RESEPTI-EDITORIN DIALOGI */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) { resetRecipeForm(); } setIsEditing(open); }}>
        <DialogContent className={dialogContentClass}>
          <DialogHeader className="p-4 border-b no-print"><div className="flex items-center justify-between w-full"><DialogTitle className="text-xl font-headline text-primary">{editId ? "Muokkaa reseptiä" : "Uusi resepti"}</DialogTitle><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => handlePrint({}, 'recipe')}><FilePdf className="w-5 h-5 text-accent"/></Button><Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button></div></div></DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
              <div className="lg:col-span-2 space-y-4">
                <Card className="industrial-card"><CardHeader><CardTitle className="text-base">Perustiedot</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label className={labelClass}>Reseptin nimi</Label><Input placeholder="Esim. Lohikeitto" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} className={inputClass} /></div><div className="space-y-2"><Label className={labelClass}>Saanto (annosta)</Label><Input placeholder="10" type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value) || 1)} className={inputClass} /></div></div><div className="space-y-2"><Label className={labelClass}>Kansio</Label><Select value={selectedFolderId} onValueChange={setSelectedFolderId}><SelectTrigger className={inputClass}><SelectValue placeholder="Valitse kansio"/></SelectTrigger><SelectContent><SelectItem value="root">Pääkansio</SelectItem>{recipeFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
                <Card className="industrial-card"><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-base">Ainesosat</CardTitle><Button onClick={() => setIngredients([...ingredients, { id: doc(collection(firestore!, 'recipes')).id, name: "", weight: 0, unit: 'g', price: 0, waste: 0 }])} size="sm" variant="outline" className="gap-2 no-print text-accent border-accent/50 h-8"><Plus className="w-4"/> Lisää</Button></CardHeader><CardContent className="pt-4 space-y-2">{ingredients.map((ing) => <div key={ing.id} className="flex flex-wrap gap-2 items-end p-2 rounded-md border border-white/5 bg-black/10"><div className="flex-1 min-w-[120px]"><Label className={labelClass}>Raaka-aine</Label><Input placeholder="Lohi" value={ing.name} onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)} className={inputClass} /></div><div className="w-20"><Label className={labelClass}>Määrä</Label><Input placeholder="150" type="number" value={ing.weight} onChange={(e) => handleIngredientChange(ing.id, 'weight', Number(e.target.value))} className={inputClass} /></div><div className="w-20"><Label className={labelClass}>Yksikkö</Label><Select value={ing.unit} onValueChange={(v: 'g'|'kg') => handleIngredientChange(ing.id, 'unit', v)}><SelectTrigger className={inputClass}/><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="kg">kg</SelectItem></SelectContent></Select></div><div className="w-24"><Label className={labelClass}>Hinta (€/kg)</Label><Input placeholder="25.5" type="number" value={ing.price} onChange={(e) => handleIngredientChange(ing.id, 'price', Number(e.target.value))} className={inputClass} /></div><div className="w-20"><Label className={labelClass}>Hävikki %</Label><Input placeholder="15" type="number" value={ing.waste} onChange={(e) => handleIngredientChange(ing.id, 'waste', Number(e.target.value))} className={inputClass} /></div><Button variant="ghost" size="icon" onClick={() => setIngredients(ingredients.filter(i => i.id !== ing.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>)}</CardContent></Card>
                <Card className="industrial-card"><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-base">Valmistusohjeet</CardTitle><Button onClick={() => setSteps([...steps, { id: doc(collection(firestore!, 'recipes')).id, text: "" }])} size="sm" variant="outline" className="gap-2 no-print text-accent border-accent/50 h-8"><Plus className="w-4"/> Lisää</Button></CardHeader><CardContent className="pt-4 space-y-3">{steps.map((step, index) => <div key={step.id} className="flex items-start gap-3"><span className="font-bold text-primary pt-1.5">{index + 1}.</span><Textarea placeholder="Kuumenna voi..." value={step.text} onChange={(e) => handleStepChange(step.id, e.target.value)} rows={2} className={cn(inputClass, "h-auto")} /><Button variant="ghost" size="icon" onClick={() => setSteps(steps.filter(s => s.id !== step.id))} className="no-print shrink-0"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>)}</CardContent></Card>
                <Card className="industrial-card"><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-base">Laitteet</CardTitle><Button onClick={() => setRecipeEquip([...recipeEquip, { id: doc(collection(firestore!, 'recipes')).id, name: "", temp: "", time: "", info: "" }])} size="sm" variant="outline" className="gap-2 no-print text-accent border-accent/50 h-8"><Plus className="w-4"/> Lisää</Button></CardHeader><CardContent className="pt-4 space-y-2">{recipeEquip.map((equip) => <div key={equip.id} className="flex flex-wrap gap-2 items-end p-2 rounded-md border border-white/5 bg-black/10"><div className="flex-1 min-w-[120px]"><Label className={labelClass}>Laite</Label><Input placeholder="Rational-uuni" value={equip.name} onChange={(e) => handleEquipChange(equip.id, 'name', e.target.value)} className={inputClass} /></div><div className="w-24"><Label className={labelClass}><Thermometer className="w-3 mr-1 inline"/>Lämpö</Label><Input placeholder="180°C" value={equip.temp} onChange={(e) => handleEquipChange(equip.id, 'temp', e.target.value)} className={inputClass} /></div><div className="w-24"><Label className={labelClass}><Clock className="w-3 mr-1 inline"/>Aika</Label><Input placeholder="15min" value={equip.time} onChange={(e) => handleEquipChange(equip.id, 'time', e.target.value)} className={inputClass} /></div><div className="flex-1 min-w-[120px]"><Label className={labelClass}>Info</Label><Input placeholder="Höyry 2" value={equip.info} onChange={(e) => handleEquipChange(equip.id, 'info', e.target.value)} className={inputClass} /></div><Button variant="ghost" size="icon" onClick={() => setRecipeEquip(recipeEquip.filter(e => e.id !== equip.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>)}</CardContent></Card>
              </div>
              <div className="space-y-6 no-print lg:sticky top-0"><Card className="industrial-card"><CardHeader><CardTitle className="text-base flex items-center gap-2 text-primary"><Scale/> Talous</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Nettopaino:</span><span className="font-mono font-bold">{recipeCalculations.totalNetWeight.toFixed(3)} kg</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">Paino/annos:</span><span className="font-mono font-bold">{recipeCalculations.portionWeight.toFixed(3)} kg</span></div><div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-white/5"><span className="text-muted-foreground font-bold">Hinta/annos:</span><span className="font-bold font-headline text-2xl text-primary">{recipeCalculations.portionCost.toFixed(2)} €</span></div></CardContent></Card></div>
            </div>
            <div className="flex gap-3 pt-6 mt-6 border-t no-print"><Button onClick={handleSaveRecipe} className="flex-1 h-12 copper-gradient font-bold text-base" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin"/> : <Save/>} Tallenna</Button><Button variant="outline" className="h-12" onClick={() => setIsEditing(false)}>Peruuta</Button></div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ANNOS-EDITORIN DIALOGI */}
      <Dialog open={isEditingDish} onOpenChange={(open) => { if (!open) { resetDishForm(); } setIsEditingDish(open); }}>
        <DialogContent className={dialogContentClass}>
          <DialogHeader className="p-4 border-b no-print"><div className="flex items-center justify-between w-full"><DialogTitle className="text-xl font-headline text-secondary-foreground">{editDishId ? "Muokkaa annosta" : "Uusi annos"}</DialogTitle><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => handlePrint({}, 'dish')}><FilePdf className="w-5 h-5 text-accent"/></Button><Button variant="ghost" size="icon" onClick={() => setIsEditingDish(false)}><X className="w-5 h-5" /></Button></div></div></DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
              <div className="lg:col-span-2 space-y-4">
                <Card className="industrial-card"><CardHeader><CardTitle className="text-base">Myyntitiedot</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className={labelClass}>Annonksen nimi</Label><Input placeholder="Paahdettua lohta..." value={dishName} onChange={(e) => setDishName(e.target.value)} className={inputClass}/></div><div className="space-y-2"><Label className={labelClass}>Myyntihinta (€)</Label><Input placeholder="24.50" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className={inputClass}/></div></div><div className="space-y-2"><Label className={labelClass}>Kansio</Label><Select value={selectedDishFolderId} onValueChange={setSelectedDishFolderId}><SelectTrigger className={inputClass}><SelectValue placeholder="Valitse kansio"/></SelectTrigger><SelectContent><SelectItem value="root">Pääkansio</SelectItem>{dishFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className={labelClass}>Kuvan URL</Label><Input placeholder="https://..." value={dishImageUrl} onChange={(e) => setDishImageUrl(e.target.value)} className={inputClass}/></div></CardContent></Card>
                <Card className="industrial-card"><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-base">Koostumus</CardTitle><Select onValueChange={(id) => { const r = globalRecipes.find(gr => gr.id === id); if (r) setSelectedRecipes([...selectedRecipes, { id: doc(collection(firestore!, 'dishes')).id, recipeId: r.id, name: r.name, cost: r.calculations.portionCost, weight: r.calculations.portionWeight }]);}}><SelectTrigger className={cn(inputClass, "w-48 h-9 no-print")}><SelectValue placeholder="Lisää resepti..." /></SelectTrigger><SelectContent>{globalRecipes.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select></CardHeader><CardContent className="pt-4 space-y-2">{selectedRecipes.map((r) => <div key={r.id} className="flex justify-between items-center p-2 rounded-md border border-white/5 bg-black/10"><span className="font-semibold text-sm">{r.name}</span><Button variant="ghost" size="icon" onClick={() => setSelectedRecipes(selectedRecipes.filter(sr => sr.id !== r.id))} className="no-print"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>)}</CardContent></Card>
              </div>
              <div className="space-y-6 no-print lg:sticky top-0">
                  <Card className="industrial-card"><CardHeader><CardTitle className="text-base flex items-center gap-2 text-secondary-foreground"><TrendingUp/> Kannattavuus</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Kustannukset:</span><span className="font-mono font-bold">{dishCalculations.totalCost.toFixed(2)} €</span></div><div className={cn("flex justify-between items-center text-lg mt-2 pt-2 border-t border-white/5 font-bold p-2 rounded-md", dishCalculations.margin >= targetMargin ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive")}><span className="uppercase">Kate:</span><span className="font-headline text-2xl">{dishCalculations.margin.toFixed(1)} %</span></div></CardContent></Card>
                  {dishImageUrl && <img src={dishImageUrl} alt={dishName} className="mt-4 rounded-lg object-cover w-full aspect-video shadow-lg"/>}
              </div>
            </div>
            <div className="flex gap-3 pt-6 mt-6 border-t no-print"><Button onClick={handleSaveDish} className="flex-1 h-12 steel-gradient font-bold text-base" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin"/> : <Save/>} Tallenna</Button><Button variant="outline" className="h-12" onClick={() => setIsEditingDish(false)}>Peruuta</Button></div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}