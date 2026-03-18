"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Folder, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  Archive,
  Loader2,
  Download,
  File,
  MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, serverTimestamp, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

type FolderType = {
  id: string
  name: string
  category: 'recipes' | 'dishes' | 'uploads'
  parentId?: string
}

// This converter ensures type safety between Firestore data and our FolderType interface
const folderConverter: FirestoreDataConverter<FolderType> = {
  toFirestore: (folder: FolderType): DocumentData => {
    // Don't write the id field back to the document
    const { id, ...data } = folder;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options): FolderType => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id, // Get the document ID from the snapshot
      name: data.name,
      category: data.category,
      parentId: data.parentId
    };
  }
};

export function ArchiveModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Firestore Refs with Converters for type safety
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'archiveFolders').withConverter(folderConverter) : null), [firestore])
  const recipesRef = useMemo(() => (firestore ? collection(firestore, 'recipes') : null), [firestore])
  const dishesRef = useMemo(() => (firestore ? collection(firestore, 'dishes') : null), [firestore])
  const uploadsRef = useMemo(() => (firestore ? collection(firestore, 'uploadedRecipes') : null), [firestore])
  
  const { data: folders = [], loading: foldersLoading } = useCollection<FolderType>(foldersRef)
  const { data: recipes = [] } = useCollection<any>(recipesRef)
  const { data: dishes = [] } = useCollection<any>(dishesRef)
  const { data: uploadedRecipes = [] } = useCollection<any>(uploadsRef)

  const [newFolderName, setNewFolderName] = useState("")
  const [activeTab, setActiveTab] = useState<'recipes' | 'dishes' | 'uploads'>('recipes')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const addFolder = async () => {
    if (!newFolderName.trim() || !foldersRef) return
    setIsSaving(true)
    try {
      const newDocRef = doc(foldersRef) // Create a reference for a new document to get an ID
      const newFolder: Omit<FolderType, 'id'> = {
        name: newFolderName,
        category: activeTab,
        parentId: currentFolderId || undefined,
      }
      await setDoc(newDocRef, newFolder) // Use the same ref to set the data
      setNewFolderName("")
      toast({ title: "Kansio luotu" })
    } catch (e) {
      console.error("Kansion luontivirhe:", e)
      toast({ variant: "destructive", title: "Virhe kansion luonnissa" })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteFolder = async (id: string) => {
    if (!firestore) return
    try {
      await deleteDoc(doc(firestore, 'archiveFolders', id))
      toast({ title: "Kansio poistettu" })
    } catch (e) { 
      console.error("Error deleting folder: ", e)
      toast({ variant: "destructive", title: "Virhe poistettaessa kansiota" })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firestore) return

    setIsUploading(true)
    const id = doc(collection(firestore, 'uploadedRecipes')).id
    const docRef = doc(firestore, 'uploadedRecipes', id)

    setDoc(docRef, {
      id,
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      folderId: currentFolderId || null,
      createdAt: serverTimestamp()
    }).then(() => {
      toast({ title: "Tiedosto ladattu", description: file.name })
    }).catch(err => {
      console.error("Latausvirhe:", err)
      toast({ variant: "destructive", title: "Tiedoston lataus epäonnistui" })
    }).finally(() => {
        setIsUploading(false)
    })
  }

  const deleteItem = async (id: string, collectionName: string) => {
    if (!firestore || !collectionName) return
    try {
      await deleteDoc(doc(firestore, collectionName, id))
      toast({ title: "Tietue poistettu" })
    } catch (e) { 
        console.error("Error deleting item: ", e)
        toast({ variant: "destructive", title: "Poisto epäonnistui" })
    }
  }

  const filteredFolders = folders.filter(f => f.category === activeTab && (currentFolderId ? f.parentId === currentFolderId : !f.parentId))
  
  const currentItems = useMemo(() => {
    let source: any[] = []
    let colName = ""
    
    if (activeTab === 'recipes') { source = recipes; colName = "recipes"; }
    else if (activeTab === 'dishes') { source = dishes; colName = "dishes"; }
    else { source = uploadedRecipes; colName = "uploadedRecipes"; }

    return source
      .filter((item: any) => (currentFolderId ? item.folderId === currentFolderId : !item.folderId))
      .filter((item: any) => item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(item => ({ ...item, colName }))
  }, [activeTab, recipes, dishes, uploadedRecipes, currentFolderId, searchTerm])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl copper-gradient flex items-center justify-center shadow-lg">
                        <Archive className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-headline font-black text-primary uppercase tracking-tight">Arkisto</h2>
                </div>
                <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 mt-1">Keittiön keskitetty tietovarasto</p>
            </div>
            {activeTab === 'uploads' && (
            <div className="flex gap-2">
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="copper-gradient hover:opacity-90 gap-2 shadow-lg font-black uppercase text-[10px] h-10 px-6">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                LATAA TIEDOSTO
                </Button>
            </div>
            )}
        </header>

        <Card className="industrial-card">
            <CardContent className="p-4 flex items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Etsi arkistosta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-black/20 border-white/10 h-11" />
            </div>
            </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setCurrentFolderId(null); }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 border border-white/5 p-1 h-12">
            <TabsTrigger value="recipes" className="text-[10px] font-black uppercase tracking-widest">RESEPTIT</TabsTrigger>
            <TabsTrigger value="dishes" className="text-[10px] font-black uppercase tracking-widest">ANNOSKORTIT</TabsTrigger>
            <TabsTrigger value="uploads" className="text-[10px] font-black uppercase tracking-widest">TIEDOSTOT</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1 industrial-card h-fit">
                <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">KANSIORAKENNE</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                <div className="flex gap-2">
                    <Input placeholder="Uusi kansio..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFolder()} className="h-9 text-xs bg-black/20 border-white/10" disabled={isSaving} />
                    <Button onClick={addFolder} size="sm" className="copper-gradient shrink-0 px-3" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="space-y-1">
                    <div onClick={() => setCurrentFolderId(null)} className={cn("flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-tight transition-all", !currentFolderId ? "bg-primary/20 text-accent border border-accent/20" : "text-muted-foreground hover:bg-white/5")}>
                    <Archive className="w-4 h-4" /> JUURITASO
                    </div>
                    {filteredFolders.map(f => (
                    <div key={f.id} onClick={() => setCurrentFolderId(f.id)} className={cn("group flex justify-between items-center p-2.5 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-tight border transition-all", currentFolderId === f.id ? "bg-primary/20 text-accent border-accent/20" : "text-muted-foreground border-transparent hover:bg-white/5")}>
                        <span className="flex items-center gap-3"><Folder className="w-4 h-4 opacity-60" /> {f.name}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    ))}
                </div>
                </CardContent>
            </Card>

            <Card className="lg:col-span-3 industrial-card relative overflow-hidden min-h-[500px]">
                <CardHeader className="bg-black/20 border-b border-white/5">
                <CardTitle className="font-headline text-lg font-black copper-text-glow uppercase flex items-center gap-3">
                    {currentFolderId ? <Folder className="w-5 h-5 text-accent" /> : <Archive className="w-5 h-5 text-accent" />}
                    {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : "JUURITASO"}
                </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentItems.map((item: any) => (
                    <Card key={item.id} className="industrial-card group hover:border-accent/40 border-none bg-white/5 transition-all">
                        <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                            {activeTab === 'uploads' ? <File className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-accent" />}
                            </div>
                            <div className="overflow-hidden">
                            <p className="text-sm font-black truncate max-w-[180px] uppercase tracking-tight">{item.name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">
                                {activeTab === 'recipes' ? `${item.portions} ANNOSTA` : activeTab === 'dishes' ? `${item.sellingPrice} €` : item.size}
                            </p>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-white/10">
                            <DropdownMenuItem className="gap-2 text-[10px] font-black uppercase">
                                <Download className="w-4 h-4" /> AVAA / LATAA
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive text-[10px] font-black uppercase" onClick={() => deleteItem(item.id, item.colName)}>
                                <Trash2 className="w-4 h-4" /> POISTA
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </CardContent>
                    </Card>
                    ))}
                    {(foldersLoading ? 
                        <div className="col-span-full py-32 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-accent"/></div> : 
                        currentItems.length === 0 && <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20"><p className="text-[10px] font-black uppercase tracking-[0.2em]">Tämä kansio on tyhjä.</p></div>
                    )}
                </div>
                </CardContent>
            </Card>
            </div>
        </Tabs>
    </div>
  )
}
