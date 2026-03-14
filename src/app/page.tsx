"use client"

import { useState } from "react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, ChevronRight, Bell, Search, Settings } from "lucide-react"
import { WorkspaceModule } from "@/components/modules/workspace"
import { MessagingModule } from "@/components/modules/messaging"
import { CloudStorageModule } from "@/components/modules/cloud-storage"
import { DirectoryModule } from "@/components/modules/directory"
import { AdminModule } from "@/components/modules/admin"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [activeModule, setActiveModule] = useState<'workspace' | 'messaging' | 'cloud' | 'directory' | 'admin'>('workspace')

  const renderModule = () => {
    switch(activeModule) {
      case 'workspace': return <WorkspaceModule />
      case 'messaging': return <MessagingModule />
      case 'cloud': return <CloudStorageModule />
      case 'directory': return <DirectoryModule />
      case 'admin': return <AdminModule />
      default: return <WorkspaceModule />
    }
  }

  const menuItems = [
    { id: 'workspace', icon: LayoutDashboard, label: 'Workspace' },
    { id: 'messaging', icon: MessageSquare, label: 'Messaging' },
    { id: 'cloud', icon: Cloud, label: 'Cloud Data' },
    { id: 'directory', icon: Users, label: 'Directory' },
    { id: 'admin', icon: ShieldCheck, label: 'Administration' },
  ] as const

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-accent/10 shadow-lg">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <span className="text-white font-headline font-bold text-xl">W</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg text-primary leading-tight">WorkHub</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Enterprise</span>
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
                    className={`h-12 px-4 rounded-xl transition-all duration-300 ${
                      activeModule === item.id 
                      ? "bg-accent/10 text-primary font-bold border-l-4 border-primary" 
                      : "hover:bg-accent/5 text-muted-foreground"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeModule === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="ml-3 font-medium">{item.label}</span>
                    {activeModule === item.id && <ChevronRight className="ml-auto w-4 h-4 text-primary" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <div className="mt-auto p-6 border-t border-accent/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-primary font-bold text-xs">
                JS
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">John Smith</span>
                <span className="text-[10px] text-muted-foreground">Admin Access</span>
              </div>
              <Settings className="w-4 h-4 ml-auto text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>
        </Sidebar>

        <SidebarInset className="bg-transparent flex flex-col min-w-0">
          <header className="h-16 border-b border-accent/10 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-accent/5">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Universal Search..." 
                  className="bg-transparent border-none text-xs focus:outline-none w-32 md:w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white" />
              </Button>
              <div className="h-8 w-[1px] bg-accent/10 mx-2" />
              <Button size="sm" className="hidden sm:flex bg-primary hover:bg-primary/90 rounded-full font-semibold">
                New Action
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1440px] mx-auto w-full">
            {renderModule()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}