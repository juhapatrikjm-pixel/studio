"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, FileImage, FileJson, MoreVertical, Upload, Search, Download, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type FileItem = {
  id: string
  name: string
  type: 'doc' | 'image' | 'data'
  size: string
  modified: string
}

export function CloudStorageModule() {
  const [files] = useState<FileItem[]>([
    { id: "1", name: "Project_Proposal_V2.pdf", type: 'doc', size: "2.4 MB", modified: "2 hours ago" },
    { id: "2", name: "Team_Sync_Photo.jpg", type: 'image', size: "4.1 MB", modified: "1 day ago" },
    { id: "3", name: "Budget_Forecast_2024.xlsx", type: 'doc', size: "1.2 MB", modified: "3 days ago" },
    { id: "4", name: "API_Configuration.json", type: 'data', size: "12 KB", modified: "1 week ago" },
    { id: "5", name: "Market_Research_Analysis.pdf", type: 'doc', size: "5.5 MB", modified: "2 weeks ago" },
  ])

  const getIcon = (type: string) => {
    switch(type) {
      case 'doc': return <FileText className="w-6 h-6 text-blue-500" />
      case 'image': return <FileImage className="w-6 h-6 text-purple-500" />
      case 'data': return <FileJson className="w-6 h-6 text-orange-500" />
      default: return <FileText className="w-6 h-6 text-gray-500" />
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Cloud Storage</h2>
          <p className="text-muted-foreground">Securely shared professional documents.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90 gap-2">
          <Upload className="w-4 h-4" /> Upload File
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search shared files..." className="pl-10 bg-white border-accent/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary group-hover:bg-accent/10 transition-colors">
                  {getIcon(file.type)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate max-w-[150px]">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{file.size} • {file.modified}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2"><Download className="w-4 h-4" /> Download</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}