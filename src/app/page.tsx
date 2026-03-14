"use client"

import { useState } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Search, Settings, ClipboardList, Truck, ShoppingBag } from "lucide-react"
import { WorkspaceModule } from "@/components/modules/workspace"
import { MessagingModule } from "@/components/modules/messaging"
import { CloudStorageModule } from "@/components/modules/cloud-storage"
import { DirectoryModule } from "@/components/modules/directory"
import { AdminModule } from "@/components/modules/admin"
import { MisaModule } from "@/components/modules/misa"
import { SuppliersModule } from "@/components/modules/suppliers"
import { OrdersModule } from "@/components/modules/orders"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [activeModule, setActiveModule] = useState<'info' | 'misa' | 'suppliers' | 'orders' | 'messaging' | 'cloud' | 'directory' | 'admin'>('info')

  const renderModule = () => {
    switch(activeModule) {
      case 'info': return <WorkspaceModule />
      case 'misa': return <MisaModule />
      case 'suppliers': return <SuppliersModule />
      case 'orders': return <OrdersModule onNavigateToSuppliers={() => setActiveModule('suppliers')} />
      case 'messaging': return <MessagingModule />
      case 'cloud': return <CloudStorageModule />
      case 'directory': return <DirectoryModule />
      case 'admin': return <AdminModule />
      default: return <WorkspaceModule />
    }
  }

  const menuItems = [
    { id: 'info', icon: LayoutDashboard, label: 'Info' },
    { id: 'misa', icon: ClipboardList, label: 'MISA' },
    { id: 'suppliers', icon: Truck, label: 'Toimittajat' },
    { id: 'orders', icon: ShoppingBag, label: 'Tilaukset' },
    { id: 'messaging', icon: MessageSquare, label: 'Messaging' },
    { id: 'cloud', icon: Cloud, label: 'Cloud Data' },
    { id: 'directory', icon: Users, label: 'Directory' },
    { id: 'admin', icon: ShieldCheck, label: 'Administration' },
  ] as const

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden text-foreground">
        <Sidebar className="border-r border-border bg-sidebar shadow-2xl">
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
                    onClick={() => setActiveModule(item.id)}
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
                <span className="text-[10px] text-muted-foreground">Lead Engineer</span>
              </div>
              <Settings className="w-4 h-4 ml-auto text-muted-foreground hover:text-accent cursor-pointer transition-colors" />
            </div>
          </div>
        </Sidebar>

        <SidebarInset className="bg-transparent flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden text-muted-foreground" />
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg border border-border/50 shadow-inner">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Universal Search..." 
                  className="bg-transparent border-none text-xs focus:outline-none w-32 md:w-64 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-accent hover:bg-white/5">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background shadow-[0_0_8px_rgba(184,115,51,0.6)]" />
              </Button>
              <div className="h-6 w-[1px] bg-border mx-2" />
              <Button size="sm" className="hidden sm:flex copper-gradient text-white hover:opacity-90 rounded-lg font-bold shadow-lg">
                New Project
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
