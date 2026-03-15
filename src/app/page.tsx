
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Settings, ClipboardList, Truck, ShoppingBag, Archive, Wrench, ShieldAlert, ChefHat, Info, UserCircle, TrendingUp, CalendarDays, Trash2, GraduationCap, LogOut, LogIn } from "lucide-react"
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
import { useFirestore, useDoc, useUser, useAuth } from "@/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

export type ModuleId = 'info' | 'shift-info' | 'tulos' | 'waste' | 'onboarding' | 'todo-calendar' | 'omavalvonta' | 'misa' | 'recipes' | 'suppliers' | 'orders' | 'maintenance' | 'archive' | 'messaging' | 'cloud' | 'directory' | 'profile' | 'admin'

export const BASE_MENU_ITEMS = [
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

function AppSidebar({ activeModule, setActiveModule, menuItems, user }: { activeModule: ModuleId, setActiveModule: (id: ModuleId) => void, menuItems: typeof BASE_MENU_ITEMS, user: any }) {
  const { setOpen, setOpenMobile } = useSidebar()
  const auth = useAuth()

  const handleModuleChange = (id: ModuleId) => {
    setActiveModule(id)
    setOpen(false)
    setOpenMobile(false)
  }

  const handleSignOut = () => {
    if (auth) signOut(auth)
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
      <div className="p-6 border-t border-white/5 mt-auto bg-black/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg steel-detail flex items-center justify-center text-black font-black text-sm shadow-md metal-shine-overlay overflow-hidden">
            {user.photoURL ? <img src={user.photoURL} alt={user.displayName} /> : (user.displayName?.[0] || user.email?.[0])}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-black text-foreground truncate">{user.displayName || 'Käyttäjä'}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold truncate">{user.email}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase text-muted-foreground hover:text-accent hover:bg-white/5" onClick={() => setActiveModule('profile')}>
            <Settings className="w-3.5 h-3.5 mr-2" /> Asetukset
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-white/5" onClick={handleSignOut} title="Kirjaudu ulos">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Sidebar>
  )
}

function LoginPage() {
  const auth = useAuth()
  const firestore = useFirestore()

  const handleLogin = async () => {
    if (!auth || !firestore) return
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      // Tallenna tai päivitä profiili kirjautumisen yhteydessä
      const user = result.user
      const userRef = doc(firestore, 'userProfiles', user.uid)
      setDoc(userRef, {
        userName: user.displayName,
        email: user.email,
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (error) {
      console.error("Login failed", error)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 brushed-metal relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full" />
      </div>

      <Card className="industrial-card max-w-md w-full relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
        <CardContent className="p-12 flex flex-col items-center text-center gap-8">
          <div className="w-20 h-20 rounded-2xl copper-gradient flex items-center justify-center shadow-[0_0_40px_rgba(184,115,51,0.4)] metal-shine-overlay">
            <span className="text-white font-headline font-black text-4xl drop-shadow-xl">W</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-headline font-black copper-text-glow uppercase tracking-tighter">Wisemisa Bistro</h1>
            <p className="text-muted-foreground font-medium text-sm">Industrial Kitchen Intelligence Platform</p>
          </div>
          
          <div className="w-full space-y-4">
            <Button 
              onClick={handleLogin} 
              className="w-full h-14 copper-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl metal-shine-overlay group"
            >
              <LogIn className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform" />
              Kirjaudu Google-tunnuksilla
            </Button>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-40">Suojattu yhteys Wisemisa Cloudiin</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Home() {
  const { user, loading } = useUser()
  const firestore = useFirestore()
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)

  const [activeModule, setActiveModule] = useState<ModuleId>('info')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [api, setApi] = useState<CarouselApi>()

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const sortedMenuItems = useMemo(() => {
    if (!profile?.moduleOrder || profile.moduleOrder.length === 0) return BASE_MENU_ITEMS

    const order = profile.moduleOrder as string[]
    const items = [...BASE_MENU_ITEMS]
    const infoItem = items.find(i => i.id === 'info')!
    const otherItems = items.filter(i => i.id !== 'info')

    const sortedOthers = otherItems.sort((a, b) => {
      const idxA = order.indexOf(a.id)
      const idxB = order.indexOf(b.id)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

    return [infoItem, ...sortedOthers]
  }, [profile?.moduleOrder])

  useEffect(() => {
    if (!api) return
    const index = sortedMenuItems.findIndex(item => item.id === activeModule)
    if (index !== -1) api.scrollTo(index)
  }, [activeModule, api, sortedMenuItems])

  useEffect(() => {
    if (!api) return
    const onSelect = () => {
      const index = api.selectedScrollSnap()
      const moduleId = sortedMenuItems[index].id as ModuleId
      setActiveModule(moduleId)
    }
    api.on("select", onSelect)
    return () => { api.off("select", onSelect) }
  }, [api, sortedMenuItems])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 rounded-xl copper-gradient animate-pulse shadow-2xl" />
    </div>
  )

  if (!user) return <LoginPage />

  const renderModule = (id: ModuleId) => {
    switch(id) {
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
        <AppSidebar activeModule={activeModule} setActiveModule={setActiveModule} menuItems={sortedMenuItems} user={user} />

        <SidebarInset className="bg-transparent flex flex-col min-w-0 z-10 relative">
          <header className="h-20 border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1">
              <SidebarTrigger className="text-muted-foreground hover:text-accent transition-transform hover:scale-110" />
            </div>

            <div className="flex flex-col items-center justify-center flex-1 text-center min-w-0">
              <div className="text-accent font-headline font-black text-xl leading-none tracking-wider tabular-nums copper-text-glow truncate">
                {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
              </div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-1.5 opacity-80 truncate w-full">
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

          <main className="flex-1 overflow-hidden relative">
            <Carousel 
              setApi={setApi} 
              className="w-full h-full"
              opts={{
                align: "start",
                loop: false,
                duration: 35,
              }}
            >
              <CarouselContent className="h-full ml-0">
                {sortedMenuItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-0 h-full overflow-y-auto">
                    <div className="p-6 md:p-12 max-w-[1600px] mx-auto w-full min-h-full">
                      <div className="max-w-6xl mx-auto space-y-12 pb-20">
                        {renderModule(item.id as ModuleId)}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
