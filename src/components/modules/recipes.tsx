
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
  Timer, 
  Thermometer,
  Folder,
  X
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

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

export function RecipesModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const { data: globalEquipment = [] } = useCollection<any>(firestore ? collection(firestore, 'equipment') : null)
  const { data: folders = [] } = useCollection<any>(firestore ? collection(firestore, 'archiveFolders') : null)

  const [isCreating, setIsCreating] = useState(false)
  const [recipeName, setRecipeName] = useState("")
  const [portions, setPortions] = useState(1)
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [recipeEquip, setRecipeEquip] = useState<RecipeEquipment[]>([])

  const recipeFolders = folders.filter(f => f.category === 'recipes')

  const calculations = useMemo(() => {
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalCost = 0
    let totalWasteWeight = 0
    let totalWasteCost = 0

    ingredients.forEach(ing => {
      const weight = Number(ing.weight) || 0
      const price = Number(ing.price) || 0
      const wastePercent = Number(ing.waste) || 0

      const cost = weight * price
      const wasteWeight = weight * (wastePercent / 100)
      const netWeight = weight - wasteWeight
      const wasteCost = wasteWeight * price

      totalGrossWeight += weight
      totalNetWeight += netWeight
      totalCost += cost
      totalWasteWeight += wasteWeight
      totalWasteCost += wasteCost
    })

    const port = portions > 0 ? portions : 1

    return {
      totalGrossWeight,
      totalNetWeight,
      totalCost,
      totalWasteWeight,
      totalWasteCost,
      portionWeight: totalNetWeight / port,
      portionCost: totalCost / port
    }
  }, [ingredients, portions])

  const handleSave = () => {
    if (!recipeName || !firestore) {
      toast({
        variant: "destructive",
        title: "Puuttuvia tietoja",
        description: "Anna reseptille vähintään nimi ennen tallennusta.",
      })
      return
    }

    const recipesColRef = collection(firestore, 'recipes')
    const recipeRef = doc(recipesColRef)
    
    const recipeData = {
      id: recipeRef.id,
      name: recipeName,
      portions: Number(portions),
      folderId: selectedFolderId === "root" ? null : selectedFolderId,
      ingredients,
      steps,
      equipment: recipeEquip,
      calculations,
      createdAt: new Date().toISOString()
    }

    setDoc(recipeRef, recipeData)
      .then(() => {
        toast({
          title: "Resepti tallennettu",
          description: `"${recipeName}" on nyt arkistoitu.`,
        })
        setIsCreating(false)
        resetForm()
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: recipeRef.path,
          operation: 'create',
          requestResourceData: recipeData
        }))
      })
  }

  const resetForm = () => {
    setRecipeName("")
    setPortions(1)
    setSelectedFolderId("root")
    setIngredients([])
    setSteps([])
    setRecipeEquip([])
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Reseptiikka</h2>
        <p className="text-muted-foreground">Luo ja hallitse keittiön reseptejä sekä annoskortteja.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card onClick={() => setIsCreating(true)} className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Aloita Resepti</CardTitle>
            <CardDescription className="text-sm">Luo yksittäinen komponentti ja arkistoi se kansioon.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full copper-gradient text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Aloita resepti
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <CookingPot className="w-7 h-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-headline">Uusi Annos</CardTitle>
            <CardDescription className="text-sm">Kokoa useista resepteistä kokonainen annos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full steel-detail text-background font-bold gap-2">
              <Plus className="w-4 h-4" /> Kokoa annos
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-6xl h-[90vh] bg-background border-border overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 border-b border-border bg-card">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-headline text-accent">Uusi resepti</DialogTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                  <X className="w-5 h-5" />
                </Button>
                <Button onClick={handleSave} className="copper-gradient text-white font-bold shadow-lg gap-2">
                  <Save className="w-4 h-4" /> Tallenna resepti
                </Button>
              </div>
            </div>
            <DialogDescription>Täytä reseptin tiedot ja laskelmat päivittyvät automaattisesti.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
              <div className="lg:col-span-2 space-y-8">
                <Card className="bg-card border-border shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Perustiedot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-accent" /> Valitse arkistokansio
                      </Label>
                      <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                        <SelectTrigger className="bg-muted/30 border-border">
                          <SelectValue placeholder="Valitse kansio..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Juuritaso (Ei kansiota)</SelectItem>
                          {recipeFolders.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Raaka-aineet</CardTitle>
                    <Button onClick={() => setIngredients([...ingredients, { id: Date.now().toString(), name: "", weight: 0, price: 0, waste: 0 }])} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent">
                      <Plus className="w-4 h-4" /> Lisää rivi
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-lg border border-border bg-white/5 group">
                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Nimi</Label>
                          <Input value={ing.name} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, name: e.target.value} : i))} className="h-8 text-xs bg-muted/20" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Paino (kg)</Label>
                          <Input type="number" step="0.01" value={ing.weight} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, weight: Number(e.target.value)} : i))} className="h-8 text-xs bg-muted/20" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Hinta (€/kg)</Label>
                          <Input type="number" step="0.01" value={ing.price} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, price: Number(e.target.value)} : i))} className="h-8 text-xs bg-muted/20" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Hävikki (%)</Label>
                          <Input type="number" value={ing.waste} onChange={(e) => setIngredients(ingredients.map(i => i.id === ing.id ? {...i, waste: Number(e.target.value)} : i))} className="h-8 text-xs bg-muted/20" />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setIngredients(ingredients.filter(i => i.id !== ing.id))} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Vaiheet</CardTitle>
                    <Button onClick={() => setSteps([...steps, { id: Date.now().toString(), text: "" }])} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent">
                      <Plus className="w-4 h-4" /> Lisää vaihe
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex gap-4 items-start group">
                        <div className="w-6 h-6 rounded-full copper-gradient text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">{index + 1}</div>
                        <Input placeholder="Kirjoita ohje..." value={step.text} onChange={(e) => setSteps(steps.map(s => s.id === step.id ? {...s, text: e.target.value} : s))} className="bg-muted/20 border-border text-sm" />
                        <Button variant="ghost" size="icon" onClick={() => setSteps(steps.filter(s => s.id !== step.id))} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-card border-border shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full copper-gradient" />
                  <CardHeader className="bg-primary/5 border-b border-border">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-accent flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Laskelmat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-xs text-muted-foreground uppercase font-bold">Nettopaino</span>
                        <span className="font-mono font-bold text-accent">{calculations.totalNetWeight.toFixed(3)} kg</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border/50 text-destructive">
                        <span className="text-xs uppercase font-bold">Hävikki ({calculations.totalWasteWeight.toFixed(3)} kg)</span>
                        <span className="font-mono font-bold">{calculations.totalWasteCost.toFixed(2)} €</span>
                      </div>
                    </div>
                    <div className="pt-4 space-y-4 bg-accent/5 p-4 rounded-xl border border-accent/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-bold">Annos:</span>
                        <span className="font-headline font-bold text-lg">{calculations.portionWeight.toFixed(3)} kg</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-bold">Hinta / Annos:</span>
                        <span className="font-headline font-bold text-2xl text-accent">{calculations.portionCost.toFixed(2)} €</span>
                      </div>
                    </div>
                    <Button onClick={handleSave} className="w-full copper-gradient text-white font-bold h-12 shadow-xl mt-4">
                      Tallenna resepti
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
                    <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Laitteet</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <Select onValueChange={(val) => {
                      const equip = globalEquipment.find(e => e.id === val)
                      if (equip) setRecipeEquip([...recipeEquip, { id: Date.now().toString(), equipmentId: equip.id, name: equip.name, temp: "", time: "", info: "" }])
                    }}>
                      <SelectTrigger className="h-9 text-xs bg-muted/30 border-border">
                        <SelectValue placeholder="Lisää laite..." />
                      </SelectTrigger>
                      <SelectContent>
                        {globalEquipment.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {recipeEquip.map((re) => (
                      <div key={re.id} className="p-3 rounded-lg border border-border bg-white/5 space-y-3 group relative">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-accent uppercase">{re.name}</h4>
                          <Button variant="ghost" size="icon" onClick={() => setRecipeEquip(recipeEquip.filter(r => r.id !== re.id))} className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="°C" value={re.temp} onChange={(e) => setRecipeEquip(recipeEquip.map(r => r.id === re.id ? {...r, temp: e.target.value} : r))} className="h-7 text-[10px] bg-muted/20" />
                          <Input placeholder="min/h" value={re.time} onChange={(e) => setRecipeEquip(recipeEquip.map(r => r.id === re.id ? {...r, time: e.target.value} : r))} className="h-7 text-[10px] bg-muted/20" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
