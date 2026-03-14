"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ListChecks, Search, AlertCircle, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ListItem = {
  id: string
  text: string
  completed: boolean
}

export function MisaModule() {
  const [misaItems, setMisaItems] = useState<ListItem[]>([
    { id: "1", text: "Generaattorin tarkistus", completed: false },
    { id: "2", text: "Öljynpaineen mittaus", completed: true },
  ])
  const [hakuItems, setHakuItems] = useState<ListItem[]>([
    { id: "3", text: "Varaosa #402 (Venttiili)", completed: false },
  ])
  const [puuteItems, setPuuteItems] = useState<ListItem[]>([
    { id: "4", text: "Tiivistesarja (Kupari)", completed: false },
  ])

  const [newItemText, setNewItemText] = useState("")

  const addItem = (list: 'misa' | 'haku' | 'puute') => {
    if (!newItemText.trim()) return
    const newItem: ListItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newItemText,
      completed: false
    }
    if (list === 'misa') setMisaItems([...misaItems, newItem])
    else if (list === 'haku') setHakuItems([...hakuItems, newItem])
    else setPuuteItems([...puuteItems, newItem])
    setNewItemText("")
  }

  const toggleItem = (list: 'misa' | 'haku' | 'puute', id: string) => {
    const update = (items: ListItem[]) => items.map(i => i.id === id ? { ...i, completed: !i.completed } : i)
    if (list === 'misa') setMisaItems(update(misaItems))
    else if (list === 'haku') setHakuItems(update(hakuItems))
    else setPuuteItems(update(puuteItems))
  }

  const removeItem = (list: 'misa' | 'haku' | 'puute', id: string) => {
    const update = (items: ListItem[]) => items.filter(i => i.id !== id)
    if (list === 'misa') setMisaItems(update(misaItems))
    else if (list === 'haku') setHakuItems(update(hakuItems))
    else setPuuteItems(update(puuteItems))
  }

  const ListContainer = ({ items, listType, title, icon: Icon, description }: { 
    items: ListItem[], 
    listType: 'misa' | 'haku' | 'puute',
    title: string,
    icon: any,
    description: string
  }) => (
    <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle className="font-headline text-xl text-foreground">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="Lisää uusi merkintä..." 
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(listType)}
            className="bg-muted/50 border-border focus:border-accent"
          />
          <Button onClick={() => addItem(listType)} className="copper-gradient text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic border-2 border-dashed border-border rounded-lg">
              Lista on tyhjä
            </div>
          )}
          {items.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                item.completed ? "bg-white/5 border-transparent opacity-60" : "bg-card border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={item.completed} 
                  onCheckedChange={() => toggleItem(listType, item.id)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <span className={cn(
                  "text-sm font-medium",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.text}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(listType, item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Misa Logistiikka</h2>
        <p className="text-muted-foreground">Hallitse listoja, hakuja ja puutteita reaaliajassa.</p>
      </header>

      <Tabs defaultValue="misa" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 border border-border p-1">
          <TabsTrigger value="misa" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <ListChecks className="w-4 h-4" /> Misa-lista
          </TabsTrigger>
          <TabsTrigger value="haku" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <Search className="w-4 h-4" /> Haku-lista
          </TabsTrigger>
          <TabsTrigger value="puute" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <AlertCircle className="w-4 h-4" /> Puute-lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="misa" className="animate-in slide-in-from-left-2 duration-300">
          <ListContainer 
            items={misaItems} 
            listType="misa" 
            title="Misa-lista" 
            icon={ListChecks} 
            description="Päivittäiset tehtävät ja tarkistukset."
          />
        </TabsContent>

        <TabsContent value="haku" className="animate-in slide-in-from-left-2 duration-300">
          <ListContainer 
            items={hakuItems} 
            listType="haku" 
            title="Haku-lista" 
            icon={Search} 
            description="Varastosta noudettavat tai etsittävät komponentit."
          />
        </TabsContent>

        <TabsContent value="puute" className="animate-in slide-in-from-left-2 duration-300">
          <ListContainer 
            items={puuteItems} 
            listType="puute" 
            title="Puute-lista" 
            icon={AlertCircle} 
            description="Kriittiset puutteet, jotka vaativat tilausta."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
