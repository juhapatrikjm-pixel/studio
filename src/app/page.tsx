"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Settings, ClipboardList, Truck, ShoppingBag, Archive, Wrench, ShieldAlert, ChefHat, Info, UserCircle, TrendingUp, CalendarDays, Trash2, GraduationCap, LogOut, LogIn, AlertCircle, Globe, Loader2 } from "lucide-react"
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
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth"
import { cn } from "@/lib/utils"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export type ModuleId = 'info' | 'shift-info' | 'tulos' | 'waste' | 'onboarding' | 'todo-calendar' | 'omavalvonta' | 'misa' | 'recipes' | 'suppliers' | 'orders' | 'maintenance' | 'archive' | 'messaging' | 'cloud' | 'directory' | 'profile' | 'admin'

export const BASE_MENU_ITEMS = [
  { id: 'info', icon: LayoutDashboard, label: 'Ohjaus' },
  { id: 'shift-info', icon: Info, label: 'Vuoro' },
  { id: 'tulos', icon: TrendingUp, label: 'Tulos' },
  { id: 'waste', icon: Trash2, label: 'Hävikki' },
  { id: 'onboarding', icon: GraduationCap, label: 'Koulutus' },
  { id: 'todo-calendar', icon: CalendarDays, label: 'To do' },
  { id: 'omavalvonta', icon: ShieldAlert, label: 'Valvonta' },
  { id: 'misa', icon: ClipboardList, label: 'Misa' },
  { id: 'recipes', icon: ChefHat, label: 'Reseptit' },
  { id: 'suppliers', icon: Truck, label: 'Tukut' },
  { id: 'orders', icon: ShoppingBag, label: 'Tilaukset' },
  { id: 'maintenance', icon: Wrench, label: 'Huolto' },
  { id: 'archive', icon: Archive, label: 'Arkisto' },
  { id: 'messaging', icon: MessageSquare, label: 'Chat' },
  { id: 'cloud', icon: Cloud, label: 'Pilvi' },
  { id: 'directory', icon: Users, label: 'Tiimi' },
  { id: 'profile', icon: UserCircle, label: 'Profiili' },
  { id: 'admin', icon: ShieldCheck, label: 'Hallinta' },
] as const

function AppSidebar({ activeModule, setActiveModule, menuItems, user }: { activeModule: ModuleId, setActiveModule: (id: ModuleId) => void, menuItems: typeof BASE_MENU_ITEMS, user: any }) {
  const { setOpen, setOpenMobile } = useSidebar()
  const handleModuleChange = (id: ModuleId) => {
    setActiveModule(id)
    setOpen(false)
    setOpenMobile(false)
  }

  return (
    <Sidebar className="border-r border-white/5 bg-sidebar shadow-2xl" collapsible="offcanvas">
      <SidebarHeader className="p-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
            <span className="text-white font-headline font-black text-sm drop-shadow-lg">W</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-black text-[10px] copper-text-glow leading-none">Wisemisa</span>
            <span className="text-[5px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5 opacity-60">Intelligence</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarMenu className="gap-0">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                isActive={activeModule === item.id}
                onClick={() => handleModuleChange(item.id as ModuleId)}
                className={cn(
                  "h-6 px-2 rounded-lg transition-all duration-300 border border-transparent group",
                  activeModule === item.id 
                  ? "bg-primary/20 text-accent font-bold border-primary/40 shadow-[inset_0_0_10px_rgba(184,115,51,0.15)]" 
                  : "hover:bg-white/5 text-muted-foreground/80 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-2.5 h-2.5 transition-colors",
                  activeModule === item.id ? 'text-accent' : 'text-muted-foreground/60 group-hover:text-accent/80'
                )} />
                <span className="ml-2 font-bold text-[8px] uppercase tracking-tight">{item.label}</span>
                {activeModule === item.id && <ChevronRight className="ml-auto w-2 h-2 text-accent animate-in slide-in-from-left-2" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="p-2 border-t border-white/5 mt-auto bg-black/20 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg steel-detail flex items-center justify-center text-black font-black text-[7px] shadow-md metal-shine-overlay overflow-hidden">
            {user.photoURL ? <img src={user.photoURL} alt={user.displayName} /> : (user.displayName?.[0] || 'U')}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[7px] font-black text-foreground truncate">{user.displayName || 'Käyttäjä'}</span>
            <span className="text-[4px] uppercase tracking-wider text-muted-foreground font-bold truncate opacity-50">{user.email}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full text-[5px] font-black uppercase text-muted-foreground hover:text-accent hover:bg-white/5 h-4 px-1" onClick={() => setActiveModule('profile')}>
          <Settings className="w-1.5 h-1.5 mr-1" /> ASETUKSET
        </Button>
      </div>
    </Sidebar>
  )
}

function LoginPage({ onDemoLogin, error, isProcessing }: { onDemoLogin: () => void, error: { title: string, desc: string } | null, isProcessing: boolean }) {
  const auth = useAuth()
  const [currentDomain, setCurrentDomain] = useState("")

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.host)
    }
  }, [])

  const handleLogin = async () => {
    if (!auth) return
    const provider = new GoogleAuthProvider()
    try {
      await signInWithRedirect(auth, provider)
    } catch (err: any) {
      console.error("Login Error:", err)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 brushed-metal relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full" />
      </div>

      <Card className="industrial-card max-w-sm w-full relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
        <CardContent className="p-6 flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-2xl copper-gradient flex items-center justify-center shadow-2xl metal-shine-overlay">
            <span className="text-white font-headline font-black text-xl drop-shadow-xl">W</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-headline font-black copper-text-glow uppercase tracking-tighter">Wisemisa Bistro</h1>
            <p className="text-muted-foreground font-black text-[7px] uppercase tracking-[0.3em] opacity-60">Industrial Kitchen Platform</p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 py-2">
              <AlertCircle className="h-3 w-3" />
              <AlertTitle className="text-[9px] font-black uppercase text-left">{error.title}</AlertTitle>
              <AlertDescription className="text-[8px] text-left leading-tight opacity-80">
                {error.desc}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="w-full space-y-2">
            <Button 
              onClick={handleLogin} 
              disabled={isProcessing}
              className="w-full h-10 copper-gradient text-white font-black uppercase tracking-widest text-[9px] shadow-2xl metal-shine-overlay"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <LogIn className="w-3.5 h-3.5 mr-2" />}
              {isProcessing ? "KÄSITTELLÄÄN..." : "KIRJAUDU GOOGLELLA"}
            </Button>
            
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-[7px] uppercase font-black"><span className="bg-card px-2 text-muted-foreground/40">TAI</span></div>
            </div>

            <Button 
              variant="outline"
              onClick={onDemoLogin} 
              className="w-full h-9 border-white/10 bg-white/5 text-muted-foreground hover:text-accent font-black uppercase tracking-widest text-[8px]"
            >
              KOKEILE DEMO-TILASSA
            </Button>
          </div>
          
          <div className="pt-2 flex flex-col items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5 w-full">
            <div className="flex items-center gap-2">
              <Globe className="w-2.5 h-2.5 text-accent" />
              <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">VALTUUTA TÄMÄ OSOITE:</span>
            </div>
            <code className="text-[7px] font-mono bg-black/40 p-1.5 rounded border border-white/10 text-accent w-full break-all">{currentDomain}</code>
            <p className="text-[6px] text-muted-foreground/60 uppercase font-bold italic">Firebase Console &rarr; Auth &rarr; Settings &rarr; Domains</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Home() {
  const { user, loading: authLoading } = useUser()
  const [demoUser, setDemoUser] = useState<any>(null)
  const [authError, setAuthError] = useState<{ title: string, desc: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const firestore = useFirestore()
  const auth = useAuth()
  
  const effectiveUser = user || demoUser
  
  const profileRef = useMemo(() => (firestore && effectiveUser ? doc(firestore, 'userProfiles', effectiveUser.uid) : null), [firestore, effectiveUser])
  const { data: profile } = useDoc<any>(profileRef)

  const [activeModule, setActiveModule] = useState<ModuleId>('info')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [api, setApi] = useState<CarouselApi>()

  useEffect(() => {
    if (!auth || !firestore) {
      setIsProcessing(false)
      return
    }

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          const u = result.user
          // Tallennetaan profiili, mutta ei anneta virheen estää sisäänpääsyä
          try {
            await setDoc(doc(firestore, 'userProfiles', u.uid), {
              userName: u.displayName,
              email: u.email,
              updatedAt: serverTimestamp()
            }, { merge: true })
          } catch (fsErr) {
            console.warn("Firestore profile save failed (Rules?), but user is authenticated.")
          }
        }
      } catch (err: any) {
        console.error("Auth redirect result error:", err)
        if (err.code === 'auth/unauthorized-domain') {
          setAuthError({ title: "Valtuuttamaton domain", desc: "Lisää tämän sovelluksen osoite Firebase-konsolin Authorized Domains -listalle." })
        } else {
          setAuthError({ title: "Kirjautumisvirhe", desc: err.message })
        }
      } finally {
        setIsProcessing(false)
      }
    }

    checkRedirect()
  }, [auth, firestore])

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const sortedMenuItems = useMemo(() => {
    if (!profile?.moduleOrder || profile.moduleOrder.length === 0) return BASE_MENU_ITEMS
    const order = profile.moduleOrder as string[]
    const items = [...BASE_MENU_ITEMS]
    const infoItem = items.find(i => i.id === 'info')!
    const otherItems = items.filter(i => i.id !== 'info')
    const sortedOthers = otherItems.sort((a, b) => {
      const idxA = order.indexOf(a.id); const idxB = order.indexOf(b.id)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1; if (idxB === -1) return -1
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
      setActiveModule(sortedMenuItems[index].id as ModuleId)
    }
    api.on("select", onSelect)
    return () => { api.off("select", onSelect) }
  }, [api, sortedMenuItems])

  if (authLoading || isProcessing) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-xl copper-gradient animate-pulse shadow-2xl" />
    </div>
  )

  if (!effectiveUser) return <LoginPage onDemoLogin={() => setDemoUser({ uid: 'demo-user', displayName: 'Demo Käyttäjä', email: 'demo@wisemisa.fi' })} error={authError} isProcessing={isProcessing} />

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
        <AppSidebar activeModule={activeModule} setActiveModule={setActiveModule} menuItems={sortedMenuItems} user={effectiveUser} />

        <SidebarInset className="bg-transparent flex flex-col min-w-0 z-10 relative">
          <header className="h-8 border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50 px-2 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1"><SidebarTrigger className="text-muted-foreground hover:text-accent h-4 w-4" /></div>
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-accent font-headline font-black text-[8px] leading-none tracking-widest tabular-nums copper-text-glow">
                {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
              </div>
              <div className="text-[5px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">
                {currentTime ? format(currentTime, 'EEEE d.M.yyyy', { locale: fi }) : '...'}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent h-4 w-4">
                <Bell className="w-2 h-2" /><span className="absolute top-0.5 right-0.5 w-1 h-1 bg-accent rounded-full border border-background" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden relative">
            <Carousel setApi={setApi} className="w-full h-full" opts={{ align: "start", loop: false, duration: 25 }}>
              <CarouselContent className="h-full ml-0">
                {sortedMenuItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-0 h-full overflow-y-auto">
                    <div className="p-1 md:p-1.5 max-w-[1600px] mx-auto w-full min-h-full">
                      <div className="max-w-5xl mx-auto space-y-1 pb-16">
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
