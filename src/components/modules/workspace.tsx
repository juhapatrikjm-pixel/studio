"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck } from "lucide-react"

export function WorkspaceModule() {
  const activities = [
    { id: 1, text: "New architectural specs uploaded to 'Facility expansion'", time: "2m ago", type: "cloud" },
    { id: 2, text: "Sarah Miller tagged you in #engineering-ops", time: "15m ago", type: "message" },
    { id: 3, text: "Daily maintenance briefing starting", time: "Now", type: "call" },
  ]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-bold text-accent">Control Panel</h1>
        <p className="text-muted-foreground">Operational status: <span className="text-green-500 font-bold">OPTIMIZED</span></p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team Capacity</CardTitle>
            <Users className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">42</div>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter mt-1">+3 New personnel</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Streams</CardTitle>
            <MessageSquare className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">12</div>
            <p className="text-[10px] text-accent font-bold uppercase tracking-tighter mt-1">4 Unread communications</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data Vault</CardTitle>
            <Cloud className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">84%</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">1.2 TB of 1.5 TB Utilized</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-lg text-accent">Operation Logs</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Real-time team synchronization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-transparent hover:border-primary/20 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                    {item.type === 'cloud' ? <Cloud className="w-4 h-4 text-accent" /> : <MessageSquare className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xl animate-breathing border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline text-lg text-accent">Security Protocol Status</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Administrative overview</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">RSA 4096 Encryption</span>
              <Badge variant="outline" className="border-green-500 text-green-500 font-bold bg-green-500/10">ACTIVE</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">Access Authorization</span>
              <Badge className="copper-gradient text-white border-none font-bold">LEVEL 5</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">Core Engine Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-xs font-bold text-green-500 uppercase">Nominal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}