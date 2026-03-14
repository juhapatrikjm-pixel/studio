
"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderPlus, Folder, FileText, FileImage, FileCode, Plus, Trash2, Search, Upload, ChevronRight, MoreVertical, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

type FolderType = {
  id: string
  name: string
  category: 'recipes' | 'dishes' | 'uploads'
  parentId?: string
}

export function ArchiveModule() {
  const firestore = useFirestore()
  
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'archiveFolders') : null), [firestore])
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore])
  
  const { data: folders = [] } = useCollection<FolderType>(foldersRef)
  const { data: recipes = [] } = useCollection<any>(recipesRef)

  const [newFolderName, setNewFolderName] = useState("")
  const [activeTab, setActiveTab] = useState<'recipes' | 'dishes' | 'uploads'>('recipes')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const addFolder = () => {
    if (!newFolderName.trim() || !firestore) return
    const id = Math.random().toString(36).substr(2, 9)
    const folderRef = doc(firestore, 'archiveFolders', id)
    
    setDoc(folderRef, {
      id,
      name: newFolderName,
      category: activeTab,
      parentId: currentFolderId || null
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: folderRef.path,
        operation: 'create'
      }))
    })
    setNewFolderName("")
  }

  const deleteFolder = (id: string) => {
    if (!firestore) return
    const folderRef = doc(firestore, 'archiveFolders', id)
    deleteDoc(folderRef)
  }

  const filteredFolders = folders.filter(f => f.category === activeTab && (currentFolderId ? f.parentId === currentFolderId : !f.parentId))
  
  // Suodatetaan kohteet
  const items = recipes.filter((r: any) => {
    if (activeTab !== 'recipes') return false
    return currentFolderId ? r.folderId === currentFolderId : !r.folderId
  })

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Arkisto</h2>
        <p className="text-muted-foreground">Reseptit, annoskortit ja ladatut tiedostot yhdessä paikassa.</p>
      </header>

      <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setCurrentFolderId(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 border border-border p-1">
          <TabsTrigger value="recipes" className="gap-2">Reseptit</TabsTrigger>
          <TabsTrigger value="dishes" className="gap-2">Annokset</TabsTrigger>
          <TabsTrigger value="uploads" className="gap-2">Ladatut reseptit</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 bg-card border-border shadow-xl h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-headline uppercase tracking-wider text-accent">Kansiot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Uusi kansio..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="h-9 text-xs" />
                <Button onClick={addFolder} size="sm" className="copper-gradient"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                <div onClick={() => setCurrentFolderId(null)} className={cn("p-2 rounded-md cursor-pointer text-xs", !currentFolderId ? "bg-primary/20 text-accent font-bold" : "text-muted-foreground hover:bg-white/5")}>
                  <Folder className="w-4 h-4 inline mr-2" /> Juuritaso
                </div>
                {filteredFolders.map(f => (
                  <div key={f.id} onClick={() => setCurrentFolderId(f.id)} className={cn("flex justify-between items-center p-2 rounded-md cursor-pointer text-xs", currentFolderId === f.id ? "bg-primary/20 text-accent font-bold" : "text-muted-foreground hover:bg-white/5")}>
                    <span><Folder className="w-4 h-4 inline mr-2 text-accent/60" /> {f.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-card border-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
                {currentFolderId ? <Folder className="w-5 h-5 text-accent" /> : <Archive className="w-5 h-5 text-accent" />}
                {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : "Juuritaso"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted/50 border border-border"><FileText className="w-5 h-5 text-accent" /></div>
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{item.portions} annosta</p>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && filteredFolders.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">Tämä kansio on tyhjä.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
