"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ListChecks, Search, AlertCircle, Plus, Trash2, Calendar as CalendarIcon, ChevronRight, LayoutList, Printer, Share2, Edit2, ClipboardList, ShoppingCart, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, query, where } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

type TaskItem = {
  id: string
  text: string
  completed: boolean
}

type MisaList = {
  id: string
  title: string
  category: 'prep' | 'tukku' | 'puute'
  items: TaskItem[]
}

export function MisaModule() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'prep' | 'tukku' | 'puute'>('prep')
  
  const misaListsRef = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'misaLists'), where('category', '==', activeTab));
  }, [firestore, activeTab]);
  
  const { data: misaLists = [] } = useCollection<MisaList>(misaListsRef);

  const [newListTitle, setNewListTitle] = useState("")
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState("")
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [tempTitle, setTempTitle] = useState("")

  const addMisaList = () => {
    if (!newListTitle.trim() || !firestore) return
    const listId = Math.random().toString(36).substr(2, 9);
    const newListRef = doc(firestore, 'misaLists', listId);
    
    const newList = {
      id: listId,
      title: newListTitle,
      category: activeTab,
      items: []
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

  const updateListTitle = (id: string) => {
    if (!tempTitle.trim() || !firestore) return;
    const listRef = doc(firestore, 'misaLists', id);
    updateDoc(listRef, { title: tempTitle });
    setEditingTitleId(null);
  }

  const addTaskToList = (listId: string) => {
    if (!newTaskText.trim() || !firestore) return
    const listRef = doc(firestore, 'misaLists', listId);
    const newTask = { id: Date.now().toString(), text: newTaskText, completed: false };

    updateDoc(listRef, {
      items: arrayUnion(newTask)
    });
    setNewTaskText("")
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

  const removeTaskFromList = (listId: string, task: TaskItem) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', listId);
    updateDoc(listRef, {
      items: arrayRemove(task)
    });
  }

  const handlePrint = () => {
    window.print();
  }

  const handleShare = (list: MisaList) => {
    const categoryName = list.category === 'tukku' ? 'HAKU' : list.category.toUpperCase();
    const text = `${categoryName}-LISTA: ${list.title}\n\n` + 
      list.items.map(i => `${i.completed ? '[x]' : '[ ]'} ${i.text}`).join('\n');
    
    if (navigator.share) {
      navigator.share({ title: list.title, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Kopioitu", description: "Lista kopioitu leikepöydälle." });
    }
  }

  const activeList = misaLists.find(l => l.id === activeListId) || misaLists[0] || null;

  const tabConfigs = {
    prep: { label: "Prep-listat", icon: ClipboardList, color: "text-accent" },
    tukku: { label: "Haku lista", icon: ShoppingCart, color: "text-blue-400" },
    puute: { label: "Puute-lista", icon: AlertTriangle, color: "text-destructive" }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 print:p-0">
      <header className="flex flex-col gap-1 no-print">
        <h2 className="text-3xl font-headline font-bold copper-text-glow">Keittiön Listat</h2>
        <p className="text-muted-foreground font-medium">Hallitse valmisteluja, hakuja ja puutteita keskitetysti.</p>
      </header>

      <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setActiveListId(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 border border-white/5 p-1 no-print h-12">
          <TabsTrigger value="prep" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <ClipboardList className="w-4 h-4" /> Prep-listat
          </TabsTrigger>
          <TabsTrigger value="tukku" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <ShoppingCart className="w-4 h-4" /> Haku lista
          </TabsTrigger>
          <TabsTrigger value="puute" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all">
            <AlertTriangle className="w-4 h-4" /> Puute-lista
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SIVUPALKKI: Listojen hallinta */}
          <Card className="lg:col-span-1 industrial-card h-fit no-print">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail opacity-50" />
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                {activeTab === 'prep' && <ClipboardList className="w-3 h-3" />}
                {activeTab === 'tukku' && <ShoppingCart className="w-3 h-3" />}
                {activeTab === 'puute' && <AlertTriangle className="w-3 h-3" />}
                {tabConfigs[activeTab].label}
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
                  {misaLists.length === 0 && (
                    <p className="text-center py-10 text-[10px] uppercase font-black tracking-widest text-muted-foreground/30 italic">Ei tallennettuja listoja</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* PÄÄNÄKYMÄ: Listan sisältö */}
          <Card className="lg:col-span-2 industrial-card relative overflow-hidden print:shadow-none print:border-none print-container">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-30 no-print" />
            {activeList ? (
              <>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-black/20">
                  <div className="flex-1">
                    {editingTitleId === activeList.id ? (
                      <div className="flex gap-2 max-w-sm">
                        <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} className="h-8 bg-white/10 text-sm font-bold border-accent/20" />
                        <Button size="sm" onClick={() => updateListTitle(activeList.id)} className="copper-gradient h-8 text-[10px] font-black">OK</Button>
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
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex gap-2 no-print">
                    <Input 
                      placeholder="Lisää uusi rivi..." 
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTaskToList(activeList.id)}
                      className="bg-white/5 border-white/10 h-12 text-sm rounded-xl focus:border-accent/40 transition-all placeholder:text-muted-foreground/40"
                    />
                    <Button onClick={() => addTaskToList(activeList.id)} className="copper-gradient h-12 px-6 shadow-xl metal-shine-overlay font-black text-xs uppercase tracking-widest">Lisää</Button>
                  </div>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-2 pb-10">
                      {activeList.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 shadow-inner hover:border-white/10 transition-all group print:border-black print:text-black">
                          <div className="flex items-center gap-4">
                            <Checkbox 
                              checked={item.completed} 
                              onCheckedChange={() => toggleTaskInList(activeList.id, item)}
                              className="w-5 h-5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent no-print"
                            />
                            <span className={cn(
                              "text-sm font-bold tracking-wide transition-all duration-300",
                              item.completed ? "line-through text-muted-foreground/40 opacity-50" : "text-foreground",
                              "print:text-black print:no-underline"
                            )}>
                              {item.text}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="no-print h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 rounded-full transition-all" 
                            onClick={() => removeTaskFromList(activeList.id, item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(!activeList.items || activeList.items.length === 0) && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                          <ListChecks className="w-12 h-12" />
                          <p className="text-xs uppercase font-black tracking-[0.2em]">Lista on tyhjä</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-6 opacity-30">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  <Plus className="w-10 h-10 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-headline font-black uppercase tracking-widest mb-2">Ei valittua listaa</h3>
                  <p className="text-xs text-muted-foreground font-medium">Luo uusi lista sivupalkista aloittaaksesi seurannan.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </Tabs>
    </div>
  )
}