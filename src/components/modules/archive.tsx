
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderPlus, Folder, FileText, FileImage, FileCode, Plus, Trash2, Search, Upload, ChevronRight, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ArchiveItem = {
  id: string
  name: string
  type: 'recipe' | 'dish' | 'file'
  fileType?: 'pdf' | 'doc' | 'image'
  parentId: string | null // null = juuri, string = kansion id
}

type ArchiveFolder = {
  id: string
  name: string
  parentId: string | null
}

export function ArchiveModule() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([
    { id: "f1", name: "Klassikot", parentId: null },
    { id: "f2", name: "Kevät 2024", parentId: null },
  ])

  const [items, setItems] = useState<ArchiveItem[]>([
    { id: "i1", name: "Bolognese kastike", type: 'recipe', parentId: "f1" },
    { id: "i2", name: "Ankka confit", type: 'dish', parentId: null },
    { id: "i3", name: "Menu_Hääjuhla.pdf", type: 'file', fileType: 'pdf', parentId: "f2" },
  ])

  const [newFolderName, setNewFolderName] = useState("")
  const [activeTab, setActiveTab] = useState("recipes")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const addFolder = () => {
    if (!newFolderName.trim()) return
    const newFolder: ArchiveFolder = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFolderName,
      parentId: currentFolderId
    }
    setFolders([...folders, newFolder])
    setNewFolderName("")
  }

  const deleteFolder = (id: string) => {
    setFolders(folders.filter(f => f.id !== id))
    setItems(items.filter(i => i.parentId !== id))
  }

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const filteredFolders = folders.filter(f => f.parentId === currentFolderId)
  const filteredItems = items.filter(i => {
    const matchesFolder = i.parentId === currentFolderId
    if (activeTab === "recipes") return matchesFolder && i.type === 'recipe'
    if (activeTab === "dishes") return matchesFolder && i.type === 'dish'
    if (activeTab === "uploads") return matchesFolder && i.type === 'file'
    return false
  })

  const getFileIcon = (type?: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />
      case 'doc': return <FileCode className="w-5 h-5 text-blue-500" />
      case 'image': return <FileImage className="w-5 h-5 text-emerald-500" />
      default: return <FileText className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Arkisto</h2>
        <p className="text-muted-foreground">Reseptit, annoskortit ja ladatut tiedostot yhdessä paikassa.</p>
      </header>

      <Tabs defaultValue="recipes" onValueChange={(val) => { setActiveTab(val); setCurrentFolderId(null); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 border border-border p-1">
          <TabsTrigger value="recipes" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <FileText className="w-4 h-4" /> Reseptit
          </TabsTrigger>
          <TabsTrigger value="dishes" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <Plus className="w-4 h-4" /> Annokset
          </TabsTrigger>
          <TabsTrigger value="uploads" className="gap-2 data-[state=active]:copper-gradient data-[state=active]:text-white transition-all">
            <Upload className="w-4 h-4" /> Ladatut reseptit
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Hallinta-paneeli */}
          <Card className="lg:col-span-1 bg-card border-border shadow-xl h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-headline uppercase tracking-wider text-accent">Kansioiden hallinta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Uusi kansio..." 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                  className="bg-muted/50 border-border h-9 text-xs"
                />
                <Button onClick={addFolder} size="sm" className="copper-gradient text-white px-3">
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <div 
                  onClick={() => setCurrentFolderId(null)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs transition-colors",
                    currentFolderId === null ? "bg-primary/20 text-accent font-bold" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <Folder className="w-4 h-4" /> Juurikansio
                </div>
                {folders.map(f => (
                  <div 
                    key={f.id}
                    className={cn(
                      "group flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors",
                      currentFolderId === f.id ? "bg-primary/20 text-accent font-bold" : "text-muted-foreground hover:bg-white/5"
                    )}
                    onClick={() => setCurrentFolderId(f.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-accent/60" />
                      {f.name}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sisältö-paneeli */}
          <Card className="lg:col-span-3 bg-card border-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
                    {currentFolderId ? <Folder className="w-5 h-5 text-accent" /> : <Archive className="w-5 h-5 text-accent" />}
                    {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : "Juuritaso"}
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">
                    {filteredItems.length} kohdetta • {filteredFolders.length} kansiota
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Etsi..." className="pl-8 h-9 text-xs bg-muted/30 border-border w-32 md:w-48" />
                  </div>
                  {activeTab === "uploads" && (
                    <Button size="sm" className="copper-gradient text-white gap-2 font-bold">
                      <Upload className="w-4 h-4" /> Lataa
                    </Button>
                  )}
                  {activeTab !== "uploads" && (
                    <Button size="sm" className="copper-gradient text-white gap-2 font-bold">
                      <Plus className="w-4 h-4" /> Uusi
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Alikansiot sisällössä */}
                {filteredFolders.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => setCurrentFolderId(f.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-6 h-6 text-accent" />
                      <span className="text-sm font-bold">{f.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent" />
                  </div>
                ))}

                {/* Itse kohteet */}
                {filteredItems.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted/50 border border-border">
                        {item.type === 'file' ? getFileIcon(item.fileType) : <FileText className="w-5 h-5 text-accent" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{item.type === 'file' ? item.fileType : 'Hhub-dokumentti'}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem className="text-xs">Avaa</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">Muokkaa</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs text-destructive" onClick={() => deleteItem(item.id)}>Poista</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {filteredFolders.length === 0 && filteredItems.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
                    Tämä kansio on tyhjä.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
