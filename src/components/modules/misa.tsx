"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ListChecks, Plus, Trash2, Calendar as CalendarIcon, Share2, Printer, Edit2, ClipboardList, ShoppingCart, AlertTriangle, ChefHat, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, updateDoc, arrayUnion, query, where } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type TaskItem = {
  id: string
  text: string
  quantity?: string
  completed: boolean
}

type MisaList = {
  id: string
  title: string
  category: 'prep' | 'tukku' | 'puute'
  items: TaskItem[]
  startDate?: string
  endDate?: string
}

export function MisaModule() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'prep' | 'tukku' | 'puute'>('prep')
  
  const misaListsRef = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'misaLists'), where('category', '==', activeTab));
  }, [firestore, activeTab]);
  
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore]);
  
  const { data: misaLists = [] } = useCollection<MisaList>(misaListsRef);
  const { data: globalRecipes = [] } = useCollection<any>(recipesRef);

  const [newListTitle, setNewListTitle] = useState("")
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState("")
  const [newTaskQuantity, setNewTaskQuantity] = useState("")
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [tempTitle, setTempTitle] = useState("")

  const activeList = misaLists.find(l => l.id === activeListId) || misaLists[0] || null;

  const addMisaList = () => {
    if (!newListTitle.trim() || !firestore) return
    const listId = Math.random().toString(36).substr(2, 9);
    const newListRef = doc(firestore, 'misaLists', listId);
    
    const newList = {
      id: listId,
      title: newListTitle,
      category: activeTab,
      items: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setDoc(newListRef, newList).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: newListRef.path,
        operation: 'create'
      }));
    });
    
    setNewListTitle("")
    setActiveListId(listId)
  }

  const removeMisaList = (id: string) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', id);
    deleteDoc(listRef);
    if (activeListId === id) setActiveListId(null)
  }

  const updateListField = (id: string, field: string, value: any) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', id);
    updateDoc(listRef, { [field]: value });
  }

  const addTaskToList = (listId: string) => {
    if (!newTaskText.trim() || !firestore) return
    const listRef = doc(firestore, 'misaLists', listId);
    const newTask = { 
      id: Date.now().toString(), 
      text: newTaskText, 
      quantity: activeTab === 'prep' ? newTaskQuantity : undefined,
      completed: false 
    };

    updateDoc(listRef, {
      items: arrayUnion(newTask)
    });
    setNewTaskText("")
    setNewTaskQuantity("")
  }

  const importRecipeToMisa = (recipeId: string) => {
    if (!activeList || !firestore) return;
    const recipe = globalRecipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const listRef = doc(firestore, 'misaLists', activeList.id);
    const newItems = recipe.ingredients.map((ing: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: ing.name,
      quantity: `${ing.weight} kg`,
      completed: false
    }));

    updateDoc(listRef, {
      items: arrayUnion(...newItems)
    });
    toast({ title: "Tuotu", description: `Reseptin ${recipe.name} ainekset lisätty.` });
  }

  const toggleTaskInList = (listId: string, task: TaskItem) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', listId);
    const currentList = misaLists.find(l => l.id === listId);
    if (!currentList) return;

    const updatedItems = currentList.items.map(item => 
      item.id === task.id ? { ...item, completed: !item.completed } : item
    );

    updateDoc(listRef, { items: updatedItems });
  }

  const removeTaskFromList = (listId: string, taskId: string) => {
    if (!firestore || !activeList) return;
    const listRef = doc(firestore, 'misaLists', listId);
    const updatedItems = activeList.items.filter(item => item.id !== taskId);
    updateDoc(listRef, { items: updatedItems });
  }

  const handlePrint = () => {
    window.print();
  }

  const handleShare = (list: MisaList) => {
    const categoryName = list.category === 'prep' ? 'MISA' : (list.category === 'tukku' ? 'HAKU' : 'PUUTE');
    const text = `${categoryName}-LISTA: ${list.title}\n` + 
      (list.startDate ? `Voimassa: ${list.startDate} - ${list.endDate}\n` : "") +
      `\n` +
      list.items.map(i => `${i.completed ? '[x]' : '[ ]'} ${i.text}${i.quantity ? ` (${i.quantity})` : ""}`).join('\n');
    
    if (navigator.share) {
      navigator.share({ title: list.title, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Kopioitu", description: "Lista kopioitu leikepöydälle." });
    }
  }

  const tabConfigs = {
    prep: { label: "Misa lista", icon: ClipboardList, color: "text-accent" },
    tukku: { label: "Haku lista", icon: ShoppingCart, color: "text-blue-400" },
    puute: { label: "Puute lista", icon: AlertTriangle, color: "text-destructive" }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 print:p-0">
      <header className="flex flex-col gap-1 no-print">
        <h2 className="text-3xl font-headline font-black copper-text-glow">Keittiön Listat</h2>
        <p className="text-muted-foreground font-medium">Hallitse misaa, hakuja ja puutteita keskitetysti.</p>
      </header>

      <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setActiveListId(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 border border-white/5 p-1 no-print h-12">
          <TabsTrigger value="prep" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <ClipboardList className="w-4 h-4" /> Misa lista
          </TabsTrigger>
          <TabsTrigger value="tukku" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <ShoppingCart className="w-4 h-4" /> Haku lista
          </TabsTrigger>
          <TabsTrigger value="puute" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <AlertTriangle className="w-4 h-4" /> Puute lista
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTOJEN HALLINTA */}
          <Card className="lg:col-span-1 industrial-card h-fit no-print">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail opacity-50" />
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                {tabConfigs[activeTab].label} HALLINTA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Uuden listan nimi..." 
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="bg-white/5 border-white/10 h-10 text-xs rounded-lg focus:border-accent/40"
                />
                <Button onClick={addMisaList} className="copper-gradient h-10 px-3 shadow-lg metal-shine-overlay">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 pr-3">
                  {misaLists.map(list => (
                    <div 
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border shadow-inner",
                        (activeListId === list.id || (!activeListId && list.id === misaLists[0]?.id))
                          ? "bg-primary/20 border-accent/40 text-accent font-black" 
                          : "bg-white/5 border-transparent hover:border-white/10 text-muted-foreground"
                      )}
                    >
                      <span className="text-xs truncate uppercase tracking-wider">{list.title}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); removeMisaList(list.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* LISTAN SISÄLTÖ */}
          <Card className="lg:col-span-2 industrial-card relative overflow-hidden print:shadow-none print:border-none print-container">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-30 no-print" />
            {activeList ? (
              <>
                <CardHeader className="flex flex-col border-b border-white/5 bg-black/20 gap-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                      {editingTitleId === activeList.id ? (
                        <div className="flex gap-2 max-w-sm">
                          <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} className="h-8 bg-white/10 text-sm font-bold border-accent/20" />
                          <Button size="sm" onClick={() => { updateListField(activeList.id, 'title', tempTitle); setEditingTitleId(null); }} className="copper-gradient h-8 text-[10px] font-black">OK</Button>
                        </div>
                      ) : (
                        <CardTitle className="font-headline text-2xl font-black flex items-center gap-3">
                          <span className={cn("p-2 rounded-lg bg-black/40 border border-white/10 no-print shadow-lg", tabConfigs[activeTab].color)}>
                            {activeTab === 'prep' && <ClipboardList className="w-5 h-5" />}
                            {activeTab === 'tukku' && <ShoppingCart className="w-5 h-5" />}
                            {activeTab === 'puute' && <AlertTriangle className="w-5 h-5" />}
                          </span>
                          <span className="copper-text-glow uppercase tracking-tight">{activeList.title}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 no-print text-muted-foreground/40 hover:text-accent transition-colors" onClick={() => { setEditingTitleId(activeList.id); setTempTitle(activeList.title); }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </CardTitle>
                      )}
                    </div>
                    <div className="flex gap-2 no-print">
                      <Button variant="outline" size="icon" className="border-white/10 text-muted-foreground hover:text-accent shadow-sm" onClick={() => handleShare(activeList)} title="Jaa lista"><Share2 className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="border-white/10 text-muted-foreground hover:text-accent shadow-sm" onClick={handlePrint} title="Tulosta PDF"><Printer className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {activeTab === 'prep' && (
                    <div className="flex flex-wrap gap-4 items-end no-print bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
                      <div className="space-y-1 flex-1 min-w-[150px]">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Alkaa</Label>
                        <Input 
                          type="date" 
                          value={activeList.startDate || ""} 
                          onChange={(e) => updateListField(activeList.id, 'startDate', e.target.value)}
                          className="h-9 bg-black/40 border-white/10 text-xs"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-[150px]">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Päättyy</Label>
                        <Input 
                          type="date" 
                          value={activeList.endDate || ""} 
                          onChange={(e) => updateListField(activeList.id, 'endDate', e.target.value)}
                          className="h-9 bg-black/40 border-white/10 text-xs"
                        />
                      </div>
                      <div className="space-y-1 flex-[2] min-w-[200px]">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2">
                          <ChefHat className="w-3 h-3" /> Tuo reseptin ainekset
                        </Label>
                        <Select onValueChange={importRecipeToMisa}>
                          <SelectTrigger className="h-9 bg-black/40 border-white/10 text-xs">
                            <SelectValue placeholder="Valitse resepti..." />
                          </SelectTrigger>
                          <SelectContent>
                            {globalRecipes.map((r: any) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  <div className="flex gap-2 no-print bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex-1 space-y-1">
                      <Input 
                        placeholder={activeTab === 'prep' ? "Tuotteen nimi..." : "Lisää uusi rivi..."}
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTaskToList(activeList.id)}
                        className="bg-black/40 border-white/10 h-11 text-sm rounded-lg"
                      />
                    </div>
                    {activeTab === 'prep' && (
                      <div className="w-24 space-y-1">
                        <Input 
                          placeholder="Määrä..." 
                          value={newTaskQuantity}
                          onChange={(e) => setNewTaskQuantity(e.target.value)}
                          className="bg-black/40 border-white/10 h-11 text-sm rounded-lg"
                        />
                      </div>
                    )}
                    <Button onClick={() => addTaskToList(activeList.id)} className="copper-gradient h-11 px-6 shadow-xl metal-shine-overlay font-black text-xs uppercase">Lisää</Button>
                  </div>

                  <div className="print-only mb-6">
                    <p className="text-xs font-bold uppercase">Voimassa: {activeList.startDate} - {activeList.endDate}</p>
                  </div>

                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-2 pb-10">
                      {/* TAULUKKO-OTSIKOT MISA-LISTALLE */}
                      {activeTab === 'prep' && activeList.items?.length > 0 && (
                        <div className="grid grid-cols-[1fr_100px_50px_40px] gap-4 px-4 py-2 text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest border-b border-white/5">
                          <span>Nimi</span>
                          <span className="text-center">Määrä</span>
                          <span className="text-center">Tila</span>
                          <span />
                        </div>
                      )}

                      {activeList.items?.map((item) => (
                        <div key={item.id} className={cn(
                          "flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 shadow-inner transition-all group print:border-black print:text-black",
                          activeTab === 'prep' && "grid grid-cols-[1fr_100px_50px_40px] gap-4"
                        )}>
                          {activeTab === 'prep' ? (
                            <>
                              <span className={cn("text-sm font-bold tracking-wide", item.completed && "line-through text-muted-foreground/40")}>{item.text}</span>
                              <span className="text-xs font-mono font-bold text-accent text-center bg-black/40 py-1 rounded border border-white/5">{item.quantity || "-"}</span>
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={item.completed} 
                                  onCheckedChange={() => toggleTaskInList(activeList.id, item)}
                                  className="w-5 h-5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent no-print"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-4">
                              <Checkbox 
                                checked={item.completed} 
                                onCheckedChange={() => toggleTaskInList(activeList.id, item)}
                                className="w-5 h-5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent no-print"
                              />
                              <span className={cn("text-sm font-bold tracking-wide", item.completed && "line-through text-muted-foreground/40")}>{item.text}</span>
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="no-print h-8 w-8 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 rounded-full" 
                            onClick={() => removeTaskFromList(activeList.id, item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-6 opacity-30">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Plus className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-xl font-headline font-black uppercase tracking-widest">Ei valittua listaa</h3>
              </div>
            )}
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
