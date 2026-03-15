
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

    setDoc(newListRef, newList);
    setNewListTitle("")
    setActiveListId(listId)
  }

  const removeMisaList = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'misaLists', id));
    if (activeListId === id) setActiveListId(null)
  }

  const updateListField = (id: string, field: string, value: any) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'misaLists', id), { [field]: value });
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

    updateDoc(listRef, { items: arrayUnion(newTask) });
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

    updateDoc(listRef, { items: arrayUnion(...newItems) });
    toast({ title: "Tuotu", description: `Reseptin ainekset lisätty.` });
  }

  const toggleTaskInList = (listId: string, task: TaskItem) => {
    if (!firestore) return;
    const currentList = misaLists.find(l => l.id === listId);
    if (!currentList) return;

    const updatedItems = currentList.items.map(item => 
      item.id === task.id ? { ...item, completed: !item.completed } : item
    );

    updateDoc(doc(firestore, 'misaLists', listId), { items: updatedItems });
  }

  const removeTaskFromList = (listId: string, taskId: string) => {
    if (!firestore || !activeList) return;
    const updatedItems = activeList.items.filter(item => item.id !== taskId);
    updateDoc(doc(firestore, 'misaLists', listId), { items: updatedItems });
  }

  const handlePrint = () => window.print();

  const handleShare = (list: MisaList) => {
    const text = `WISEMISA ${list.category.toUpperCase()}: ${list.title}\n` + 
      list.items.map(i => `${i.completed ? '✓' : '○'} ${i.text} ${i.quantity || ''}`).join('\n');
    
    if (navigator.share) {
      navigator.share({ title: list.title, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Kopioitu" });
    }
  }

  const tabConfigs = {
    prep: { label: "Misa", icon: ClipboardList, color: "text-accent" },
    tukku: { label: "Haku", icon: ShoppingCart, color: "text-blue-400" },
    puute: { label: "Puute", icon: AlertTriangle, color: "text-destructive" }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 print:p-0">
      <header className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Listat</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 border-white/10" onClick={handlePrint}><Printer className="w-3.5 h-3.5" /></Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setActiveListId(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/40 border border-white/5 p-1 no-print h-10">
          <TabsTrigger value="prep" className="gap-1.5 font-black uppercase text-[9px] tracking-widest h-full"><ClipboardList className="w-3 h-3" /> MISA</TabsTrigger>
          <TabsTrigger value="tukku" className="gap-1.5 font-black uppercase text-[9px] tracking-widest h-full"><ShoppingCart className="w-3 h-3" /> HAKU</TabsTrigger>
          <TabsTrigger value="puute" className="gap-1.5 font-black uppercase text-[9px] tracking-widest h-full"><AlertTriangle className="w-3 h-3" /> PUUTE</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 industrial-card h-fit no-print">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">HALLINTA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Uusi lista..." 
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="bg-white/5 border-white/10 h-9 text-xs"
                />
                <Button onClick={addMisaList} className="copper-gradient h-9 px-3"><Plus className="w-4 h-4" /></Button>
              </div>
              <ScrollArea className="max-h-[250px] md:max-h-none">
                <div className="space-y-1">
                  {misaLists.map(list => (
                    <div 
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className={cn(
                        "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border",
                        (activeListId === list.id || (!activeListId && list.id === misaLists[0]?.id))
                          ? "bg-primary/20 border-accent/40 text-accent font-black" 
                          : "bg-white/5 border-transparent text-muted-foreground"
                      )}
                    >
                      <span className="text-[11px] truncate uppercase tracking-widest">{list.title}</span>
                      <Trash2 className="w-3.5 h-3.5 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeMisaList(list.id); }} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 industrial-card relative overflow-hidden print:border-none print-container">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-20 no-print" />
            {activeList ? (
              <>
                <CardHeader className="flex flex-col border-b border-white/5 bg-black/20 gap-3 p-4">
                  <div className="flex flex-row items-center justify-between">
                    <CardTitle className="font-headline text-lg font-black copper-text-glow uppercase truncate">
                      {activeList.title}
                    </CardTitle>
                    <div className="flex gap-1 no-print">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShare(activeList)}><Share2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTitleId(activeList.id); setTempTitle(activeList.title); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  {activeTab === 'prep' && (
                    <div className="no-print bg-white/5 p-3 rounded-lg border border-white/5 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-black text-muted-foreground">VKO ALKU</Label>
                          <Input type="date" value={activeList.startDate || ""} onChange={(e) => updateListField(activeList.id, 'startDate', e.target.value)} className="h-7 bg-black/40 text-[10px]" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-black text-muted-foreground">VKO LOPPU</Label>
                          <Input type="date" value={activeList.endDate || ""} onChange={(e) => updateListField(activeList.id, 'endDate', e.target.value)} className="h-7 bg-black/40 text-[10px]" />
                        </div>
                      </div>
                      <Select onValueChange={importRecipeToMisa}>
                        <SelectTrigger className="h-7 bg-black/40 text-[10px]"><SelectValue placeholder="Tuo resepti..." /></SelectTrigger>
                        <SelectContent className="text-[10px]">{globalRecipes.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-4 space-y-4">
                  <div className="flex gap-2 no-print">
                    <Input 
                      placeholder="Lisää rivi..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTaskToList(activeList.id)}
                      className="bg-black/40 border-white/10 h-9 text-xs"
                    />
                    {activeTab === 'prep' && <Input placeholder="Määrä" value={newTaskQuantity} onChange={(e) => setNewTaskQuantity(e.target.value)} className="w-16 bg-black/40 h-9 text-xs" />}
                    <Button onClick={() => addTaskToList(activeList.id)} className="copper-gradient h-9 px-4 text-[10px] font-black">LISÄÄ</Button>
                  </div>

                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-1.5 pb-10">
                      {activeList.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/5 group shadow-inner">
                          <Checkbox checked={item.completed} onCheckedChange={() => toggleTaskInList(activeList.id, item)} className="w-4 h-4 no-print border-white/20" />
                          <div className="flex-1 min-w-0">
                            <span className={cn("text-[11px] font-bold tracking-tight", item.completed && "line-through text-muted-foreground/40")}>{item.text}</span>
                          </div>
                          {item.quantity && <span className="text-[9px] font-mono font-black text-accent bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{item.quantity}</span>}
                          <Trash2 className="w-3 h-3 text-destructive/40 hover:text-destructive no-print opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => removeTaskFromList(activeList.id, item.id)} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-4 opacity-20"><Plus className="w-8 h-8" /><span className="text-[10px] uppercase font-black tracking-widest">Ei valittua listaa</span></div>
            )}
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
