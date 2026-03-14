"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ListChecks, Search, AlertCircle, Plus, Trash2, Calendar as CalendarIcon, ChevronRight, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fi } from "date-fns/locale"

type TaskItem = {
  id: string
  text: string
  completed: boolean
}

type MisaList = {
  id: string
  title: string
  startDate?: Date
  endDate?: Date
  items: TaskItem[]
}

export function MisaModule() {
  // Misa-listat (useita listoja)
  const [misaLists, setMisaLists] = useState<MisaList[]>([
    { 
      id: "1", 
      title: "Parsa menu", 
      startDate: new Date(2024, 3, 16), 
      endDate: new Date(2024, 5, 29),
      items: [
        { id: "m1", text: "Parsan kuorinta (10kg)", completed: false },
        { id: "m2", text: "Hollandaise-pohja valmiiksi", completed: true },
      ]
    },
    { 
      id: "2", 
      title: "Lounasvalmistelut", 
      items: [
        { id: "l1", text: "Päivän keitto: Paahdettu tomaatti", completed: false },
        { id: "l2", text: "Salaattipöydän täyttö", completed: false },
      ]
    }
  ])

  // Haku ja Puute -listat pysyvät yksittäisinä apulistoina
  const [hakuItems, setHakuItems] = useState<TaskItem[]>([
    { id: "h1", text: "Valkoviinietikka (5L)", completed: false },
    { id: "h2", text: "Savupaprikajauhe", completed: false },
  ])
  const [puuteItems, setPuuteItems] = useState<TaskItem[]>([
    { id: "p1", text: "Kupari-puhdistusaine", completed: false },
    { id: "p2", text: "Chili-öljy loppu", completed: false },
  ])

  const [newListTitle, setNewListTitle] = useState("")
  const [activeListId, setActiveListId] = useState<string | null>(misaLists[0]?.id || null)
  const [newTaskText, setNewTaskText] = useState("")

  // Listojen hallinta
  const addMisaList = () => {
    if (!newListTitle.trim()) return
    const newList: MisaList = {
      id: Math.random().toString(36).substr(2, 9),
      title: newListTitle,
      items: []
    }
    setMisaLists([...misaLists, newList])
    setNewListTitle("")
    setActiveListId(newList.id)
  }

  const removeMisaList = (id: string) => {
    setMisaLists(misaLists.filter(l => l.id !== id))
    if (activeListId === id) setActiveListId(null)
  }

  // Tehtävien hallinta listoissa
  const addTaskToList = (listId: string) => {
    if (!newTaskText.trim()) return
    setMisaLists(misaLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: [...list.items, { id: Date.now().toString(), text: newTaskText, completed: false }]
        }
      }
      return list
    }))
    setNewTaskText("")
  }

  const toggleTaskInList = (listId: string, taskId: string) => {
    setMisaLists(misaLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(item => item.id === taskId ? { ...item, completed: !item.completed } : item)
        }
      }
      return list
    }))
  }

  const removeTaskFromList = (listId: string, taskId: string) => {
    setMisaLists(misaLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.filter(item => item.id !== taskId)
        }
      }
      return list
    }))
  }

  const activeList = misaLists.find(l => l.id === activeListId)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Keittiölogistiikka</h2>
        <p className="text-muted-foreground">Hallitse menuja, hakuja ja raaka-ainepuutteita.</p>
      </header>

      <Tabs defaultValue="misa" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 border border-border p-1">
          <TabsTrigger value="misa" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <ListChecks className="w-4 h-4" /> Misa-listat
          </TabsTrigger>
          <TabsTrigger value="haku" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <Search className="w-4 h-4" /> Haku-lista
          </TabsTrigger>
          <TabsTrigger value="puute" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <AlertCircle className="w-4 h-4" /> Puute-lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="misa" className="animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listojen valinta / Hallinta */}
            <Card className="lg:col-span-1 bg-card border-border shadow-xl h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent">Projektit & Menut</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Uuden listan nimi..." 
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMisaList()}
                    className="bg-muted/50 border-border"
                  />
                  <Button onClick={addMisaList} className="copper-gradient text-white px-3">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {misaLists.map(list => (
                    <div 
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                        activeListId === list.id 
                          ? "bg-primary/20 border-primary/50 text-accent font-bold" 
                          : "bg-transparent border-transparent hover:bg-white/5 text-muted-foreground"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{list.title}</span>
                        {list.startDate && list.endDate && (
                          <span className="text-[10px] opacity-60">
                            {format(list.startDate, 'd.M.')} - {format(list.endDate, 'd.M.')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeMisaList(list.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <ChevronRight className={cn("w-4 h-4 transition-transform", activeListId === list.id ? "rotate-90 text-accent" : "")} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aktiivisen listan tehtävät */}
            <Card className="lg:col-span-2 bg-card border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
              {activeList ? (
                <>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-2xl text-foreground flex items-center gap-2">
                          <LayoutList className="w-5 h-5 text-accent" />
                          {activeList.title}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {activeList.startDate && activeList.endDate 
                            ? `Voimassa: ${format(activeList.startDate, 'd.MM.yyyy')} – ${format(activeList.endDate, 'd.MM.yyyy')}`
                            : "Ei asetettua aikaväliä."}
                        </CardDescription>
                      </div>
                      
                      {/* Päivämäärän asetus popup */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 border-accent/20 text-accent hover:bg-accent/10">
                            <CalendarIcon className="w-4 h-4" /> Muokkaa aikaa
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
                          <div className="p-4 border-b border-border text-xs font-bold uppercase text-accent">Aseta voimassaoloaika</div>
                          <Calendar
                            mode="range"
                            selected={{
                              from: activeList.startDate,
                              to: activeList.endDate,
                            }}
                            onSelect={(range) => {
                              setMisaLists(misaLists.map(l => 
                                l.id === activeList.id 
                                ? { ...l, startDate: range?.from, endDate: range?.to } 
                                : l
                              ))
                            }}
                            initialFocus
                            locale={fi}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Lisää tehtävä (esim. Sipulin pilkkominen)..." 
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTaskToList(activeList.id)}
                        className="bg-muted/50 border-border focus:border-accent"
                      />
                      <Button onClick={() => addTaskToList(activeList.id)} className="copper-gradient text-white">
                        Lisää
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {activeList.items.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed border-border rounded-lg">
                          Lista on tyhjä. Lisää ensimmäinen prep-tehtävä.
                        </div>
                      )}
                      {activeList.items.map((item) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                            item.completed ? "bg-white/5 border-transparent opacity-60" : "bg-card border-border hover:border-primary/40 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={item.completed} 
                              onCheckedChange={() => toggleTaskInList(activeList.id, item.id)}
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
                            onClick={() => removeTaskFromList(activeList.id, item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  Valitse lista vasemmalta tai luo uusi aloittaaksesi.
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="haku" className="animate-in slide-in-from-left-2 duration-300">
          <SimpleList 
            items={hakuItems} 
            setItems={setHakuItems} 
            title="Haku-lista" 
            icon={Search} 
            description="Tukusta tai varastosta noudettavat tavarat." 
            placeholder="Esim. Tuore hiiva..."
          />
        </TabsContent>

        <TabsContent value="puute" className="animate-in slide-in-from-left-2 duration-300">
          <SimpleList 
            items={puuteItems} 
            setItems={setPuuteItems} 
            title="Puute-lista" 
            icon={AlertCircle} 
            description="Kriittiset puutteet, jotka täytyy tilata heti." 
            placeholder="Esim. Kerma 35% loppu..."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SimpleList({ items, setItems, title, icon: Icon, description, placeholder }: any) {
  const [text, setText] = useState("")
  const add = () => {
    if (!text.trim()) return
    setItems([...items, { id: Date.now().toString(), text, completed: false }])
    setText("")
  }
  return (
    <Card className="bg-card border-border shadow-2xl relative overflow-hidden">
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
            placeholder={placeholder} 
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="bg-muted/50 border-border"
          />
          <Button onClick={add} className="copper-gradient text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={item.completed} 
                  onCheckedChange={() => setItems(items.map((i: any) => i.id === item.id ? { ...i, completed: !i.completed } : i))}
                />
                <span className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>{item.text}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(items.filter((i: any) => i.id !== item.id))}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
