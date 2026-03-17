"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileText, 
  FileImage, 
  FileJson, 
  MoreVertical, 
  Upload, 
  Search, 
  Download, 
  Trash2, 
  FolderPlus, 
  Folder, 
  ChevronRight, 
  ArrowLeft,
  File,
  Loader2,
  Zap
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fi } from "date-fns/locale"

type CloudFile = {
  id: string
  name: string
  type: string
  size: string
  folderId: string | null
  createdAt: any
}

type CloudFolder = {
  id: string
  name: string
  parentId: string | null
  createdAt: any
}

export function CloudStorageModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Firestore Refs
  const foldersRef = useMemo(() => (firestore ? collection(firestore, 'cloudFolders') : null), [firestore])
  const filesRef = useMemo(() => (firestore ? collection(firestore, 'cloudFiles') : null), [firestore])

  // Queries
  const foldersQuery = useMemo(() => {
    if (!foldersRef) return null
    return query(foldersRef, where('parentId', '==', currentFolderId), orderBy('name', 'asc'))
  }, [foldersRef, currentFolderId])

  const filesQuery = useMemo(() => {
    if (!filesRef) return null
    return query(filesRef, where('folderId', '==', currentFolderId), orderBy('createdAt', 'desc'))
  }, [filesRef, currentFolderId])

  const { data: folders = [] } = useCollection<CloudFolder>(foldersQuery)
  const { data: files = [] } = useCollection<CloudFile>(filesQuery)

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !firestore) return
    setIsSaving(true)
    try {
      const id = Math.random().toString(36).substr(2, 9)
      const docRef = doc(firestore, 'cloudFolders', id)
      
      await setDoc(docRef, {
        id,
        name: newFolderName,
        parentId: currentFolderId,
        createdAt: serverTimestamp()
      })
      setNewFolderName("")
      toast({ title: "Kansio luotu" })
    } catch (e) {
      console.error("Kansiovirhe:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firestore) return

    setIsUploading(true)
    const id = Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'cloudFiles', id)

    // Metadatan tallennus
    setDoc(docRef, {
      id,
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      folderId: currentFolderId,
      createdAt: serverTimestamp()
    }).then(() => {
      setIsUploading(false)
      toast({ title: "Tiedosto ladattu", description: file.name })
    }).catch(err => {
      setIsUploading(false)
      console.error("Latausvirhe:", err)
    })
  }

  const handleDeleteFile = async (id: string) => {
    if (!firestore) return
    try {
      await deleteDoc(doc(firestore, 'cloudFiles', id))
    } catch (e) { console.error(e) }
  }

  const handleDeleteFolder = async (id: string) => {
    if (!firestore) return
    try {
      await deleteDoc(doc(firestore, 'cloudFolders', id))
    } catch (e) { console.error(e) }
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage className="w-6 h-6 text-purple-400" />
    if (type.includes('pdf') || type.includes('word')) return <FileText className="w-6 h-6 text-blue-400" />
    if (type.includes('json') || type.includes('code')) return <FileJson className="w-6 h-6 text-orange-400" />
    return <File className="w-6 h-6 text-muted-foreground" />
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl copper-gradient flex items-center justify-center shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-headline font-black text-primary uppercase tracking-tight">Pilvi</h2>
          </div>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 mt-1">Pysyvä tallennus pilvessä</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="copper-gradient hover:opacity-90 gap-2 shadow-lg font-black uppercase text-[10px] h-10 px-6"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
            LATAA TIEDOSTO
          </Button>
        </div>
      </header>

      <Card className="industrial-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Etsi tiedostoja..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/20 border-white/10 h-11" 
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input 
              placeholder="Uusi kansio..." 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="bg-black/20 border-white/10 h-11 text-xs" 
              disabled={isSaving}
            />
            <Button onClick={handleCreateFolder} variant="outline" className="h-11 border-white/10 text-accent" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        {currentFolderId && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentFolderId(null)}
            className="h-7 px-2 text-accent hover:text-accent hover:bg-accent/5"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> TAKAISIN JUUREEN
          </Button>
        )}
        {!currentFolderId && <span>SIJAINTI: JUURI</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KANSIOT */}
        {folders.map((folder) => (
          <Card 
            key={folder.id} 
            className="industrial-card group hover:border-accent/40 cursor-pointer transition-all border-none bg-white/5"
            onClick={() => setCurrentFolderId(folder.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <Folder className="w-6 h-6 text-accent" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black uppercase tracking-tight truncate">{folder.name}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">KANSIO</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* TIEDOSTOT */}
        {filteredFiles.map((file) => (
          <Card key={file.id} className="industrial-card group hover:border-primary/40 transition-all border-none bg-white/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/10 transition-colors">
                  {getFileIcon(file.type)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black truncate max-w-[180px]">{file.name}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">
                    {file.size} • {file.createdAt?.toDate ? format(file.createdAt.toDate(), 'd.M.yyyy', { locale: fi }) : 'Nyt'}
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
                    <Download className="w-4 h-4" /> LATAA
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2 text-destructive text-[10px] font-black uppercase"
                    onClick={() => handleDeleteFile(file.id)}
                  >
                    <Trash2 className="w-4 h-4" /> POISTA
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {folders.length === 0 && filteredFiles.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Tämä sijainti on tyhjä. Lataa tiedosto tai luo kansio.</p>
          </div>
        )}
      </div>
    </div>
  )
}
