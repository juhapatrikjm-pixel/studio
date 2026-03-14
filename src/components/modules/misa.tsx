"use client"

import { useState, useMemo } from "react"
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
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

type TaskItem = {
  id: string
  text: string
  completed: boolean
}

type MisaList = {
  id: string
  title: string
  startDate?: string
  endDate?: string
  items: TaskItem[]
}

export function MisaModule() {
  const firestore = useFirestore();
  const misaListsRef = useMemo(() => (firestore ? collection(firestore, 'misaLists') : null), [firestore]);
  const { data: misaLists = [] } = useCollection<MisaList>(misaListsRef);

  const [newListTitle, setNewListTitle] = useState("")
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState("")

  const addMisaList = () => {
    if (!newListTitle.trim() || !firestore) return
    const listId = Math.random().toString(36).substr(2, 9);
    const newListRef = doc(firestore, 'misaLists', listId);
    
    setDoc(newListRef, {
      title: newListTitle,
      items: []
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: newListRef.path,
        operation: 'create',
        requestResourceData: { title: newListTitle, items: [] }
      }));
    });
    
    setNewListTitle("")
    setActiveListId(listId)
  }

  const removeMisaList = (id: string) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', id);
    deleteDoc(listRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: listRef.path,
        operation: 'delete'
      }));
    });
    if (activeListId === id) setActiveListId(null)
  }

  const addTaskToList = (listId: string) => {
    if (!newTaskText.trim() || !firestore) return
    const listRef = doc(firestore, 'misaLists', listId);
    const newTask = { id: Date.now().toString(), text: newTaskText, completed: false };

    updateDoc(listRef, {
      items: arrayUnion(newTask)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: listRef.path,
        operation: 'update',
        requestResourceData: newTask
      }));
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

    updateDoc(listRef, { items: updatedItems }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: listRef.path,
        operation: 'update'
      }));
    });
  }

  const removeTaskFromList = (listId: string, task: TaskItem) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'misaLists', listId);
    updateDoc(listRef, {
      items: arrayRemove(task)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: listRef.path,
        operation: 'update'
      }));
    });
  }

  const activeList = misaLists.find(l => l.id === (activeListId || misaLists[0]?.id));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Prep-listat</h2>
        <p className="text-muted-foreground">Hallitse keittiön valmisteluja ja menuja.</p>
      </header>

      <Tabs defaultValue="misa" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 border border-border p-1">
          <TabsTrigger value="misa" className="gap-2">Prep-listat</TabsTrigger>
          <TabsTrigger value="haku" className="gap-2">Haku-lista</TabsTrigger>
          <TabsTrigger value="puute" className="gap-2">Puute-lista</TabsTrigger>
        </TabsList>

        <TabsContent value="misa">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  />
                  <Button onClick={addMisaList} className="copper-gradient"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-1">
                  {misaLists.map(list => (
                    <div 
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                        (activeListId === list.id || (!activeListId && list.id === misaLists[0]?.id))
                          ? "bg-primary/20 border-primary/50 text-accent font-bold" 
                          : "bg-transparent border-transparent hover:bg-white/5 text-muted-foreground"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{list.title}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeMisaList(list.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-card border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
              {activeList ? (
                <>
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                      <LayoutList className="w-5 h-5 text-accent" />
                      {activeList.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Lisää tehtävä..." 
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTaskToList(activeList.id)}
                      />
                      <Button onClick={() => addTaskToList(activeList.id)} className="copper-gradient">Lisää</Button>
                    </div>
                    <div className="space-y-2">
                      {activeList.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={item.completed} 
                              onCheckedChange={() => toggleTaskInList(activeList.id, item)}
                            />
                            <span className={cn(item.completed && "line-through text-muted-foreground")}>{item.text}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeTaskFromList(activeList.id, item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground">Luo lista aloittaaksesi.</div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
