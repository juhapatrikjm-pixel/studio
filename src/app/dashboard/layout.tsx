"use client"

import { useUser, useFirestore, useDoc } from "@/firebase"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useMemo, useState, ReactNode } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Settings, ClipboardList, Truck, ShoppingBag, Archive, Wrench, ShieldAlert, ChefHat, Info, UserCircle, TrendingUp, CalendarDays, Trash2, GraduationCap, Zap, Loader2, GripVertical } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PageCarousel } from "@/components/ui/page-carousel"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export const BASE_MENU_ITEMS = [
  { id: 'info', path: '/dashboard', icon: LayoutDashboard, label: 'Ohjaus' },
  { id: 'shift-info', path: '/dashboard/shift-info', icon: Info, label: 'INFO' },
  { id: 'tulos', path: '/dashboard/tulos', icon: TrendingUp, label: 'Tulos' },
  { id: 'waste', path: '/dashboard/waste', icon: Trash2, label: 'Hävikki' },
  { id: 'onboarding', path: '/dashboard/onboarding', icon: GraduationCap, label: 'Perehdytys' },
  { id: 'todo-calendar', path: '/dashboard/todo-calendar', icon: CalendarDays, label: 'To do' },
  { id: 'omavalvonta', path: '/dashboard/omavalvonta', icon: ShieldAlert, label: 'OMAVALVONTA' },
  { id: 'misa', path: '/dashboard/misa', icon: ClipboardList, label: 'Misa' },
  { id: 'recipes', path: '/dashboard/recipes', icon: ChefHat, label: 'Reseptit' },
  { id: 'suppliers', path: '/dashboard/suppliers', icon: Truck, label: 'Tukut' },
  { id: 'orders', path: '/dashboard/orders', icon: ShoppingBag, label: 'Tilaukset' },
  { id: 'maintenance', path: '/dashboard/maintenance', icon: Wrench, label: 'Huolto' },
  { id: 'archive', path: '/dashboard/archive', icon: Archive, label: 'Arkisto' },
  { id: 'messaging', path: '/dashboard/messaging', icon: MessageSquare, label: 'Chat' },
  { id: 'cloud', path: '/dashboard/cloud', icon: Cloud, label: 'Pilvi' },
  { id: 'directory', path: '/dashboard/directory', icon: Users, label: 'Tiimi' },
  { id: 'profile', path: '/dashboard/profile', icon: UserCircle, label: 'Profiili' },
  { id: 'admin', path: '/dashboard/admin', icon: ShieldCheck, label: 'Hallinta' },
] as const

type MenuItemType = typeof BASE_MENU_ITEMS[number];

function AppSidebar({ user, profile, menuItems, onOrderChange }: { user: any, profile: any, menuItems: MenuItemType[], onOrderChange: (items: MenuItemType[]) => void }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(menuItems);
    // Account for the non-draggable item by adding 1 to the index
    const [reorderedItem] = items.splice(result.source.index + 1, 1);
    items.splice(result.destination.index + 1, 0, reorderedItem);
    onOrderChange(items);
  };

  const draggableItems = menuItems.slice(1);

  return (
    <Sidebar className="border-r border-white/5 bg-sidebar shadow-2xl" collapsible="offcanvas">
        <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
            <span className="text-white font-headline font-black text-xl drop-shadow-lg">W</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-black text-base copper-text-glow leading-none">Wisemisa</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1 opacity-60">Intelligence</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu className="gap-1">
          {[menuItems[0]].map(item => (
              <SidebarMenuItem key={item.id}>
                <Link href={item.path} onClick={() => setOpenMobile(false)} className="flex-1">
                  <SidebarMenuButton isActive={pathname === item.path} className={cn("h-10 px-3 rounded-xl transition-all duration-300 border border-transparent group w-full", pathname === item.path ? "bg-primary/20 text-accent font-bold border-primary/40 shadow-[inset_0_0_10px_rgba(184,115,51,0.15)]" : "hover:bg-white/5 text-muted-foreground/80 hover:text-foreground")}>
                    <item.icon className={cn("w-5 h-5 transition-colors", pathname === item.path ? 'text-accent' : 'text-muted-foreground/60 group-hover:text-accent/80')} />
                    <span className="ml-3 font-bold text-sm uppercase tracking-tight">{item.label}</span>
                    {pathname === item.path && <ChevronRight className="ml-auto w-4 h-4 text-accent animate-in slide-in-from-left-2" />}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          ))}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sidebar-menu">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {draggableItems.map((item, index) => (
                     <Draggable key={item.id} draggableId={item.id} index={index}>
                       {(provided, snapshot) => (
                         <div ref={provided.innerRef} {...provided.draggableProps} className={cn("flex items-center", snapshot.isDragging && "opacity-50")}>
                            <div {...provided.dragHandleProps} className="p-2 cursor-grab"><GripVertical className="w-5 h-5 text-muted-foreground/30"/></div>
                            <SidebarMenuItem className="flex-1">
                              <Link href={item.path} onClick={() => setOpenMobile(false)} className="flex-1">
                                <SidebarMenuButton isActive={pathname === item.path} className={cn("h-10 px-3 rounded-xl transition-all duration-300 border border-transparent group w-full", pathname === item.path ? "bg-primary/20 text-accent font-bold border-primary/40 shadow-[inset_0_0_10px_rgba(184,115,51,0.15)]" : "hover:bg-white/5 text-muted-foreground/80 hover:text-foreground")}>
                                  <item.icon className={cn("w-5 h-5 transition-colors", pathname === item.path ? 'text-accent' : 'text-muted-foreground/60 group-hover:text-accent/80')} />
                                  <span className="ml-3 font-bold text-sm uppercase tracking-tight">{item.label}</span>
                                  {pathname === item.path && <ChevronRight className="ml-auto w-4 h-4 text-accent animate-in slide-in-from-left-2" />}
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                         </div>
                       )}
                     </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </SidebarMenu>
      </SidebarContent>
      <div className="p-4 border-t border-white/5 mt-auto bg-black/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl steel-detail flex items-center justify-center text-black font-black text-sm shadow-md metal-shine-overlay overflow-hidden">
            {profile?.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : user?.photoURL ? <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" /> : (profile?.userName?.[0] || user?.displayName?.[0] || 'A')}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">{profile?.role === 'admin' ? 'ADMIN' : 'TIIMI'}</span>
            <span className="text-xs font-black text-foreground truncate">{profile?.userName || user?.displayName || 'Ylläpitäjä'}</span>
          </div>
        </div>
        <Link href="/dashboard/profile"><Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase text-muted-foreground hover:text-accent hover:bg-white/5 h-8 px-2"><Settings className="w-4 h-4 mr-2" /> ASETUKSET</Button></Link>
      </div>
    </Sidebar>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)

  const [menuItems, setMenuItems] = useState(BASE_MENU_ITEMS);

  useEffect(() => {
    if (profile?.moduleOrder) {
      const order = profile.moduleOrder as string[];
      const items = [...BASE_MENU_ITEMS];
      const infoItem = items.find(i => i.id === 'info')!;
      const otherItems = items.filter(i => i.id !== 'info');
      const sortedOthers = otherItems.sort((a, b) => { const idxA = order.indexOf(a.id); const idxB = order.indexOf(b.id); if (idxA === -1 && idxB === -1) return 0; if (idxA === -1) return 1; if (idxB === -1) return -1; return idxA - idxB; });
      setMenuItems([infoItem, ...sortedOthers]);
    }
  }, [profile]);

  const handleOrderChange = (newItems: MenuItemType[]) => {
    setMenuItems(newItems);
    if (profileRef) { 
      const newOrder = newItems.filter(item => item.id !== 'info').map(item => item.id); 
      setDoc(profileRef, { moduleOrder: newOrder }, { merge: true })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: profileRef.path,
            operation: 'update',
            requestResourceData: { moduleOrder: newOrder }
          }));
        });
    }
  };

  useEffect(() => { if (!loading && !user) { router.push('/') } }, [user, loading, router])
  useEffect(() => { setCurrentTime(new Date()); const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer) }, [])

  if (loading || (!user && !profile)) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl copper-gradient animate-pulse shadow-2xl" />
        <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-accent" /><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Ladataan istuntoa...</span></div>
    </div>
  )

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground relative brushed-metal">
        <AppSidebar user={user} profile={profile} menuItems={menuItems} onOrderChange={handleOrderChange} />
        <SidebarInset className="bg-transparent flex flex-col min-w-0 z-10 relative">
           <header className="h-14 border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50 px-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1"><SidebarTrigger className="text-muted-foreground hover:text-accent" /><Badge variant="outline" className="border-accent/40 text-accent font-black tracking-widest bg-accent/5 px-2 py-0.5 h-5 text-[9px] gap-1"><Zap className="w-3 h-3" /> {profile?.role === 'admin' ? 'ADMIN' : 'TIIMI'}</Badge></div>
            <div className="flex flex-col items-center justify-center flex-1 text-center"><div className="text-accent font-headline font-black text-sm leading-none tracking-widest tabular-nums copper-text-glow">{currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}</div><div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 opacity-60">{currentTime ? format(currentTime, 'EEEE d.M.yyyy', { locale: fi }) : '...'}</div></div>
            <div className="flex items-center gap-3 flex-1 justify-end"><Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent"><Bell className="w-5 h-5" /><span className="absolute top-3 right-3 w-2 h-2 bg-accent rounded-full border-2 border-background" /> </Button></div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full min-h-full">
              <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <PageCarousel menuItems={menuItems}>
                    {children}
                </PageCarousel>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
