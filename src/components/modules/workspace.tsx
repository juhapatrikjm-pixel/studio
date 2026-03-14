"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck } from "lucide-react"

export function WorkspaceModule() {
  const activities = [
    { id: 1, text: "New document uploaded to 'Q4 Planning'", time: "2m ago", type: "cloud" },
    { id: 2, text: "Sarah Miller mentioned you in #design", time: "15m ago", type: "message" },
    { id: 3, text: "Weekly Sync call starting in 5 mins", time: "Now", type: "call" },
  ]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-bold text-primary">Workspace Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, here is your team's current status.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <MessageSquare className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 new discussions</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cloud Storage</CardTitle>
            <Cloud className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84%</div>
            <p className="text-xs text-muted-foreground">1.2 TB used of 1.5 TB</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Recent Team Activity</CardTitle>
            <CardDescription>Stay updated with your colleagues.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    {item.type === 'cloud' ? <Cloud className="w-4 h-4 text-accent" /> : <MessageSquare className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Security Health</CardTitle>
            <CardDescription>Your team administration status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">End-to-End Encryption</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Admin Access Level</span>
              <Badge className="bg-primary text-primary-foreground">Full</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Server Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}