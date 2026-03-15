
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Search, Settings, ClipboardList, Truck, ShoppingBag, Archive, Wrench, ShieldAlert, ChefHat, Info, UserCircle, TrendingUp, CalendarDays, Trash2, GraduationCap } from "lucide-react"
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
import { ProfileModule } from "@/components/modules/profile"
import { TulosModule } from "@/components/modules/tulos"
import { TodoCalendarModule } from "@/components/modules/todo-calendar"
import { WasteModule } from "@/components/modules/waste"
import { OnboardingModule } from "@/components/modules/onboarding"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useFirestore, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

type ModuleId = 'info' | 'shift-info' | 'tulos' | 'waste' | 'todo-calendar' | 'omavalvonta' | 'misa' | 'recipes' | 'suppliers' | 'orders' | 'maintenance' | 'archive' | 'messaging' | 'cloud' | 'directory' | 'profile' | 'admin' | 'onboarding'

const menuItems = [
  { id: 'info', icon: LayoutDashboard, label: 'Ohjauspaneeli' },
  { id: 'shift-info', icon: Info, label: 'Vuoro-info' },
  { id: 'tulos', icon: TrendingUp, label: 'Tulosseuranta' },
  { id: 'waste', icon: Trash2, label: 'Hävikkiseuranta' },
  { id: 'onboarding', icon: GraduationCap, label: 'Perehdytys' },
  { id: 'todo-calendar', icon: CalendarDays, label: 'Kalenteri & To do' },
  { id: 'omavalvonta', icon: ShieldAlert, label: 'Omavalvonta' },
  { id: 'misa', icon: ClipboardList, label: 'Misa-lista' },
  { id: 'recipes', icon: ChefHat, label: 'Reseptiikka' },
  { id: 'suppliers', icon: Truck, label: 'Toimittajat' },
  { id: 'orders', icon: ShoppingBag, label: 'Tilaukset' },
  { id: 'maintenance', icon: Wrench, label: 'Laitteet & Huolto' },
  { id: 'archive', icon: Archive, label: 'Arkisto' },
  { id: 'messaging', icon: MessageSquare, label: 'Viestintä' },
  { id: 'cloud', icon: Cloud, label: 'Pilvidata' },
  { id: 'directory', icon: Users, label: 'Yhteystiedot' },
  { id: 'profile', icon: UserCircle, label: 'Profiili' },
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
    <Sidebar className="border-r border-white/5 bg-sidebar shadow-2xl" collapsible="offcanvas">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl copper-gradient flex items-center justify-center shadow-[0_0_20px_rgba(184,115,51,0.5)] metal-shine-overlay">
            <span className="text-white font-headline font-black text-2xl drop-shadow-lg">W</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-black text-xl copper-text-glow leading-none">Wisemisa</span>
            <span className="font-headline font-bold text-lg text-muted-foreground leading-none">Bistro</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-accent/80 font-bold">Industrial</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        <SidebarMenu className="gap-1.5">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                isActive={activeModule === item.id}
                onClick={() => handleModuleChange(item.id as ModuleId)}
                className={cn(
                  "h-11 px-4 rounded-lg transition-all duration-300 border border-transparent group",
                  activeModule === item.id 
                  ? "bg-primary/20 text-accent font-bold border-primary/40 shadow-[inset_0_0_12px_rgba(184,115,51,0.2)]" 
                  : "hover:bg-white/5 text-muted-foreground/80 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-4.5 h-4.5 transition-colors",
                  activeModule === item.id ? 'text-accent' : 'text-muted-foreground/60 group-hover:text-accent/80'
                )} />
                <span className="ml-3 font-medium text-sm">{item.label}</span>
                {activeModule === item.id && <ChevronRight className="ml-auto w-3.5 h-3.5 text-accent animate-in slide-in-from-left-2" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="p-6 border-t border-white/5 mt-auto bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg steel-detail flex items-center justify-center text-black font-black text-sm shadow-md metal-shine-overlay">
            JS
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-foreground">John Smith</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Mestari</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground hover:text-accent hover:bg-transparent">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Sidebar>
  )
}

function BackgroundWatermark() {
  const firestore = useFirestore()
  const userId = "demo-user-123"
  const profileRef = useMemo(() => (firestore ? doc(firestore, 'userProfiles', userId) : null), [firestore])
  const { data: profile } = useDoc<any>(profileRef)

  if (!profile?.logoUrl) return null

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden opacity-[0.08] transition-all duration-1000 grayscale contrast-150">
      <img 
        src={profile.logoUrl} 
        alt="Background Watermark" 
        className="w-[60%] max-w-[800px] object-contain animate-pulse"
        style={{ animationDuration: '15s', filter: 'blur(2px) drop-shadow(0 0 40px rgba(184, 115, 51, 0.3))' }}
      />
    </div>
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
      case 'tulos': return <TulosModule />
      case 'waste': return <WasteModule />
      case 'onboarding': return <OnboardingModule />
      case 'todo-calendar': return <TodoCalendarModule />
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
      case 'profile': return <ProfileModule />
      case 'admin': return <AdminModule />
      default: return <WorkspaceModule />
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground relative brushed-metal">
        <BackgroundWatermark />
        
        <AppSidebar activeModule={activeModule} setActiveModule={setActiveModule} />

        <SidebarInset className="bg-transparent flex flex-col min-w-0 z-10 relative">
          <header className="h-20 border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50 px-8 flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1">
              <SidebarTrigger className="text-muted-foreground hover:text-accent transition-transform hover:scale-110" />
            </div>

            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-accent font-headline font-black text-2xl leading-none tracking-widest tabular-nums copper-text-glow">
                {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
              </div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">
                {currentTime ? format(currentTime, 'EEEE d. MMMM yyyy', { locale: fi }) : 'Alustetaan...'}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent hover:bg-white/5 group">
                <Bell className="w-5 h-5 group-hover:animate-bounce" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full border-2 border-background shadow-[0_0_12px_rgba(184,115,51,0.8)]" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 md:p-12 max-w-[1600px] mx-auto w-full relative">
            <div className="max-w-6xl mx-auto space-y-12">
              {renderModule()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
