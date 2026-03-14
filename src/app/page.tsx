
"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Search, Settings, ClipboardList, Truck, ShoppingBag, Archive, Wrench, ShieldAlert, ChefHat, Info } from "lucide-react"
import { WorkspaceModule } from "@/components/modules/workspace"
import { MessagingModule } from "@/components/modules/messaging"
import { CloudStorageModule } from "@/components/modules/cloud-storage"
import { DirectoryModule } from "@/components/modules/directory"
import { AdminModule } from "@/components/modules/admin"
import { MisaModule } from "@/components/modules/misa"
import { SuppliersModule } from "@/components/modules/suppliers"
import { OrdersModule } from "@/components/modules/orders"
import { ArchiveModule } from "@/components/modules/archive"
import { MaintenanceModule } from "@/components/modules/maintenance"
import { OmavalvontaModule } from "@/components/modules/omavalvonta"
import { RecipesModule } from "@/components/modules/recipes"
import { ShiftInfoModule } from "@/components/modules/shift-info"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fi } from "date-fns/locale"

type ModuleId = 'info' | 'shift-info' | 'omavalvonta' | 'misa' | 'recipes' | 'suppliers' | 'orders' | 'maintenance' | 'archive' | 'messaging' | 'cloud' | 'directory' | 'admin'

const menuItems = [
  { id: 'info', icon: LayoutDashboard, label: 'Ohjauspaneeli' },
  { id: 'shift-info', icon: Info, label: 'Vuoro-info' },
  { id: 'omavalvonta', icon: ShieldAlert, label: 'Omavalvonta' },
  { id: 'misa', icon: ClipboardList, label: 'MISA' },
  { id: 'recipes', icon: ChefHat, label: 'Reseptiikka' },
  { id: 'suppliers', icon: Truck, label: 'Toimittajat' },
  { id: 'orders', icon: ShoppingBag, label: 'Tilaukset' },
  { id: 'maintenance', icon: Wrench, label: 'Laitteet & Huolto' },
  { id: 'archive', icon: Archive, label: 'Arkisto' },
  { id: 'messaging', icon: MessageSquare, label: 'Viestintä' },
  { id: 'cloud', icon: Cloud, label: 'Pilvidata' },
  { id: 'directory', icon: Users, label: 'Yhteystiedot' },
  { id: 'admin', icon: ShieldCheck, label: 'Hallinta' },
] as const

function AppSidebar({ activeModule, setActiveModule }: { activeModule: ModuleId, setActiveModule: (id: ModuleId) => void }) {
  const { setOpen, setOpenMobile } = useSidebar()

  const handleModuleChange = (id: ModuleId) => {
    setActiveModule(id)
    setOpen(false)
    setOpenMobile(false)
  }

  return (
    <Sidebar className="border-r border-border bg-sidebar shadow-2xl" collapsible="offcanvas">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg copper-gradient flex items-center justify-center shadow-[0_0_15px_rgba(184,115,51,0.4)]">
            <span className="text-white font-headline font-bold text-xl">W</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-lg text-primary leading-tight">WorkHub</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Industrial Edition</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu className="gap-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                isActive={activeModule === item.id}
                onClick={() => handleModuleChange(item.id as ModuleId)}
                className={`h-12 px-4 rounded-lg transition-all duration-300 border border-transparent ${
                  activeModule === item.id 
                  ? "bg-primary/20 text-accent font-bold border-primary/50 shadow-inner" 
                  : "hover:bg-white/5 text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeModule === item.id ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className="ml-3 font-medium">{item.label}</span>
                {activeModule === item.id && <ChevronRight className="ml-auto w-4 h-4 text-accent" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="p-6 border-t border-border mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md steel-detail flex items-center justify-center text-background font-bold text-xs shadow-sm">
            JS
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">John Smith</span>
            <span className="text-[10px] text-muted-foreground">Pääinsinööri</span>
          </div>
          <Settings className="w-4 h-4 ml-auto text-muted-foreground hover:text-accent cursor-pointer transition-colors" />
        </div>
      </div>
    </Sidebar>
  )
}

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleId>('info')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const renderModule = () => {
    switch(activeModule) {
      case 'info': return <WorkspaceModule />
      case 'shift-info': return <ShiftInfoModule />
      case 'omavalvonta': return <OmavalvontaModule />
      case 'misa': return <MisaModule />
      case 'recipes': return <RecipesModule />
      case 'suppliers': return <SuppliersModule />
      case 'orders': return <OrdersModule onNavigateToSuppliers={() => setActiveModule('suppliers')} />
      case 'maintenance': return <MaintenanceModule />
      case 'archive': return <ArchiveModule />
      case 'messaging': return <MessagingModule />
      case 'cloud': return <CloudStorageModule />
      case 'directory': return <DirectoryModule />
      case 'admin': return <AdminModule />
      default: return <WorkspaceModule />
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground">
        <AppSidebar activeModule={activeModule} setActiveModule={setActiveModule} />

        <SidebarInset className="bg-transparent flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="text-muted-foreground hover:text-accent" />
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg border border-border/50 shadow-inner">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Yleishaku..." 
                  className="bg-transparent border-none text-xs focus:outline-none w-32 md:w-64 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-accent font-headline font-bold text-xl leading-none tracking-widest tabular-nums">
                {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
              </div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                {currentTime ? format(currentTime, 'EEEE d. MMMM yyyy', { locale: fi }) : 'Ladataan...'}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent hover:bg-white/5">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background shadow-[0_0_8px_rgba(184,115,51,0.6)]" />
              </Button>
              <div className="h-6 w-[1px] bg-border mx-2" />
              <Button size="sm" className="hidden sm:flex copper-gradient text-white hover:opacity-90 rounded-lg font-bold shadow-lg">
                Uusi projekti
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1440px] mx-auto w-full">
            <div className="max-w-6xl mx-auto">
              {renderModule()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
