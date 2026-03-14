
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
  ScrollText, 
  CookingPot, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Scale, 
  Euro, 
  Timer, 
  Thermometer,
  ListOrdered
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Ingredient = {
  id: string
  name: string
  weight: number // kg
  price: number // €/kg
  waste: number // %
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

export function RecipesModule() {
  const firestore = useFirestore()
  const { data: globalEquipment = [] } = useCollection<any>(firestore ? collection(firestore, 'equipment') : null)

  const [isCreating, setIsCreating] = useState(false)
  const [recipeName, setRecipeName] = useState("")
  const [portions, setPortions] = useState(1)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [recipeEquip, setRecipeEquip] = useState<RecipeEquipment[]>([])

  // Laskennat
  const calculations = useMemo(() => {
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalCost = 0
    let totalWasteWeight = 0
    let totalWasteCost = 0

    ingredients.forEach(ing => {
      const cost = ing.weight * ing.price
      const wasteWeight = ing.weight * (ing.waste / 100)
      const netWeight = ing.weight - wasteWeight
      const wasteCost = wasteWeight * ing.price

      totalGrossWeight += ing.weight
      totalNetWeight += netWeight
      totalCost += cost
      totalWasteWeight += wasteWeight
      totalWasteCost += wasteCost
    })

    return {
      totalGrossWeight,
      totalNetWeight,
      totalCost,
      totalWasteWeight,
      totalWasteCost,
      portionWeight: portions > 0 ? totalNetWeight / portions : 0,
      portionCost: portions > 0 ? totalCost / portions : 0
    }
  }, [ingredients, portions])

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now().toString(), name: "", weight: 0, price: 0, waste: 0 }])
  }

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing))
  }

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id))
  }

  const addStep = () => {
    setSteps([...steps, { id: Date.now().toString(), text: "" }])
  }

  const updateStep = (id: string, text: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, text } : s))
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id))
  }

  const addEquipmentToRecipe = (equipId: string) => {
    const equip = globalEquipment.find(e => e.id === equipId)
    if (!equip) return
    setRecipeEquip([...recipeEquip, { 
      id: Date.now().toString(), 
      equipmentId: equip.id, 
      name: equip.name, 
      temp: "", 
      time: "", 
      info: "" 
    }])
  }

  const updateRecipeEquip = (id: string, field: keyof RecipeEquipment, value: string) => {
    setRecipeEquip(recipeEquip.map(re => re.id === id ? { ...re, [field]: value } : re))
  }

  const removeRecipeEquip = (id: string) => {
    setRecipeEquip(recipeEquip.filter(re => re.id !== id))
  }

  const handleSave = () => {
    if (!recipeName || !firestore) return
    const id = Date.now().toString()
    const recipeRef = doc(firestore, 'recipes', id)
    
    const recipeData = {
      id,
      name: recipeName,
      portions,
      ingredients,
      steps,
      equipment: recipeEquip,
      calculations,
      createdAt: new Date().toISOString()
    }

    setDoc(recipeRef, recipeData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: recipeRef.path,
        operation: 'create',
        requestResourceData: recipeData
      }))
    })

    setIsCreating(false)
    resetForm()
  }

  const resetForm = () => {
    setRecipeName("")
    setPortions(1)
    setIngredients([])
    setSteps([])
    setRecipeEquip([])
  }

  if (isCreating) {
    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-3xl font-headline font-bold text-accent">Uusi resepti</h2>
          </div>
          <Button onClick={handleSave} className="copper-gradient text-white gap-2 font-bold shadow-lg">
            <Save className="w-4 h-4" /> Tallenna resepti
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Perustiedot */}
            <Card className="bg-card border-border shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Perustiedot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reseptin nimi</Label>
                  <Input 
                    placeholder="Esim. Talon kastike..." 
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annosmäärä (kpl/hlö)</Label>
                  <Input 
                    type="number" 
                    value={portions}
                    onChange={(e) => setPortions(Number(e.target.value))}
                    className="bg-muted/30 border-border"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Raaka-aineet */}
            <Card className="bg-card border-border shadow-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 copper-gradient opacity-50" />
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-headline">Raaka-aineet</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold">Hinnat per kg/litra</CardDescription>
                </div>
                <Button onClick={addIngredient} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent">
                  <Plus className="w-4 h-4" /> Lisää raaka-aine
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-lg border border-border bg-white/5 group">
                    <div className="md:col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Nimi</Label>
                      <Input 
                        placeholder="Raaka-aine..." 
                        value={ing.name}
                        onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Paino (kg)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={ing.weight}
                        onChange={(e) => updateIngredient(ing.id, 'weight', Number(e.target.value))}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Hinta (€/kg)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={ing.price}
                        onChange={(e) => updateIngredient(ing.id, 'price', Number(e.target.value))}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Hävikki (%)</Label>
                      <Input 
                        type="number" 
                        value={ing.waste}
                        onChange={(e) => updateIngredient(ing.id, 'waste', Number(e.target.value))}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(ing.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <div className="py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic text-sm">
                    Ei raaka-aineita lisättynä.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Laitteet */}
            <Card className="bg-card border-border shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline">Laitteet</CardTitle>
                <div className="w-48">
                  <Select onValueChange={addEquipmentToRecipe}>
                    <SelectTrigger className="h-8 text-xs bg-muted/30 border-border">
                      <SelectValue placeholder="Valitse laite..." />
                    </SelectTrigger>
                    <SelectContent>
                      {globalEquipment.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipeEquip.map((re) => (
                  <div key={re.id} className="p-4 rounded-lg border border-border bg-white/5 space-y-3 group relative">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-accent">{re.name}</h4>
                      <Button variant="ghost" size="icon" onClick={() => removeRecipeEquip(re.id)} className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Lämpötila
                        </Label>
                        <Input 
                          placeholder="°C" 
                          value={re.temp}
                          onChange={(e) => updateRecipeEquip(re.id, 'temp', e.target.value)}
                          className="h-8 text-xs bg-muted/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Aika
                        </Label>
                        <Input 
                          placeholder="min / h" 
                          value={re.time}
                          onChange={(e) => updateRecipeEquip(re.id, 'time', e.target.value)}
                          className="h-8 text-xs bg-muted/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Lisätieto</Label>
                        <Input 
                          placeholder="Esim. Esilämmitys..." 
                          value={re.info}
                          onChange={(e) => updateRecipeEquip(re.id, 'info', e.target.value)}
                          className="h-8 text-xs bg-muted/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ohjeet */}
            <Card className="bg-card border-border shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline">Valmistusohje</CardTitle>
                <Button onClick={addStep} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent">
                  <Plus className="w-4 h-4" /> Lisää vaihe
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex gap-4 items-start group">
                    <div className="w-6 h-6 rounded-full copper-gradient text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <Input 
                      placeholder="Kirjoita ohje..." 
                      value={step.text}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      className="bg-muted/20 border-border text-sm"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sivupalkki - Laskelmat */}
          <div className="space-y-6">
            <Card className="bg-card border-border shadow-2xl sticky top-24 overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full copper-gradient" />
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="text-sm font-headline uppercase tracking-widest text-accent flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Laskelmat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Kokonaispaino (Brutto)</span>
                    <span className="font-mono font-bold">{calculations.totalGrossWeight.toFixed(3)} kg</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Kokonaispaino (Netto)</span>
                    <span className="font-mono font-bold text-accent">{calculations.totalNetWeight.toFixed(3)} kg</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/50 text-destructive">
                    <span className="text-xs uppercase font-bold">Hävikin osuus (Paino)</span>
                    <span className="font-mono font-bold">-{calculations.totalWasteWeight.toFixed(3)} kg</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Kokonaiskustannus</span>
                    <span className="font-mono font-bold">{calculations.totalCost.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/50 text-destructive">
                    <span className="text-xs uppercase font-bold">Hävikin hinta</span>
                    <span className="font-mono font-bold">-{calculations.totalWasteCost.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="pt-4 space-y-4 bg-accent/5 p-4 rounded-xl border border-accent/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-accent uppercase font-black">Yksi annos ({portions} kpl)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-bold">Paino:</span>
                    <span className="font-headline font-bold text-lg">{calculations.portionWeight.toFixed(3)} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-bold">Hinta:</span>
                    <span className="font-headline font-bold text-2xl text-accent">{calculations.portionCost.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Reseptiikka</h2>
        <p className="text-muted-foreground">Luo ja hallitse keittiön reseptejä sekä annoskortteja.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reseptit -osio */}
        <Card 
          onClick={() => setIsCreating(true)}
          className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Aloita Resepti</CardTitle>
            <CardDescription className="text-sm">
              Luo yksittäinen komponentti, raaka-aine tai valmistusohje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full copper-gradient text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Aloita resepti
            </Button>
            
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                <ScrollText className="w-3.5 h-3.5" /> Ohjeistus
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Reseptieditori laskee automaattisesti raaka-aineiden painot, kustannukset ja hävikin vaikutuksen.
                Voit liittää reseptiin laitteita ja vaiheittaiset ohjeet.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Annokset -osio */}
        <Card className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <CookingPot className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Uusi Annos</CardTitle>
            <CardDescription className="text-sm">
              Kokoa useista resepteistä kokonainen annos tai menu-kokonaisuus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full steel-detail text-background font-bold gap-2">
              <Plus className="w-4 h-4" /> Kokoa annos
            </Button>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                <Utensils className="w-3.5 h-3.5" /> Viimeisimmät annokset
              </div>
              <div className="space-y-2 opacity-50 italic text-xs text-center py-4 border border-dashed border-border rounded-lg">
                Tulossa pian: Annosten kokoonpano.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alapaneeli */}
      <Card className="bg-muted/30 border-border border-dashed">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10 border border-accent/20">
              <ScrollText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-bold">Automatisoitu arkistointi</h4>
              <p className="text-xs text-muted-foreground">Kaikki tallentamasi reseptit löytyvät automaattisesti myös Arkisto-osiosta.</p>
            </div>
          </div>
          <Button variant="outline" className="text-xs border-accent/30 text-accent hover:bg-accent/10">
            Lue käyttöohje
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
