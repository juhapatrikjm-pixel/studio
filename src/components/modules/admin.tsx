
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Shield, Settings, Lock, Percent, Smile, Banknote, Clock, Users2, LayoutGrid, ChevronUp, ChevronDown, Globe, Coins } from "lucide-react"
import { useFirestore, useDoc, useCollection, useUser } from "@/firebase"
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BASE_MENU_ITEMS } from "@/app/dashboard/layout"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES = [
  { id: 'admin', name: 'Ylläpitäjä', kitchenTitle: 'Keittiömestari', price: 24.90, desc: 'Täydet oikeudet hallintaan ja talouteen.' },
  { id: 'power', name: 'Pääkäyttäjä', kitchenTitle: 'Vuoromestari', price: 6.90, desc: 'Oikeus hallita listoja ja tilauksia.' },
  { id: 'editor', name: 'Muokkaaja', kitchenTitle: 'Kokki', price: 4.90, desc: 'Oikeus kuitata tehtäviä ja muokata reseptejä.' },
  { id: 'viewer', name: 'Katselija', kitchenTitle: 'Apuhenkilöstö', price: 4.90, desc: 'Luku-oikeus listoihin ja reseptiikkaan.' },
]

export function AdminModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  
  const { data: settings } = useDoc<any>(settingsRef)
  const { data: profile } = useDoc<any>(profileRef)

  const { data: contacts = [] } = useCollection<any>(firestore ? collection(firestore, 'contacts') : null)

  const [targetMargin, setTargetMargin] = useState(75)
  const [hourlyRate, setHourlyRate] = useState(22)
  const [language, setLanguage] = useState('fi')
  const [currency, setCurrency] = useState('EUR')
  const [messages, setMessages] = useState<string[]>([])
  const [moduleOrder, setModuleOrder] = useState<string[]>([])

  useEffect(() => {
    if (settings) {
      setTargetMargin(settings.targetMargin || 75)
      setHourlyRate(settings.hourlyRate || 22)
      setLanguage(settings.language || 'fi')
      setCurrency(settings.currency || 'EUR')
      setMessages(settings.cheerMessages || [])
    }
  }, [settings])

  useEffect(() => {
    if (profile?.moduleOrder) {
      setModuleOrder(profile.moduleOrder)
    } else {
      setModuleOrder(BASE_MENU_ITEMS.map(m => m.id))
    }
  }, [profile])

  const subscriptionStats = useMemo(() => {
    const teamMembers = contacts.filter(c => c.isTeamMember)
    let totalCost = 0
    const counts: Record<string, number> = { admin: 0, power: 0, editor: 0, viewer: 0 }
    
    teamMembers.forEach(m => {
      const roleObj = ROLES.find(r => r.kitchenTitle === m.role)
      if (roleObj) {
        counts[roleObj.id]++
        totalCost += roleObj.price
      }
    })

    return { totalCost, membersCount: teamMembers.length, counts }
  }, [contacts])

  const saveSettings = () => {
    if (!settingsRef) return
    setDoc(settingsRef, { targetMargin, hourlyRate, language, currency, cheerMessages: messages }, { merge: true })
      .then(() => toast({ title: "Asetukset tallennettu" }))
  }

  const saveModuleOrder = () => {
    if (!profileRef) return
    setDoc(profileRef, { moduleOrder, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => toast({ title: "Järjestys tallennettu" }))
  }

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...moduleOrder]
    const target = direction === 'up' ? index - 1 : index + 1
    if (index === 0 || target === 0 || target < 0 || target >= newOrder.length) return
    const temp = newOrder[index]; newOrder[index] = newOrder[target]; newOrder[target] = temp
    setModuleOrder(newOrder)
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-headline font-black text-primary uppercase tracking-tight">Hallinta</h2>
        <p className="text-muted-foreground">Tiimin oikeudet ja sovelluksen globaalit asetukset.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="industrial-card border-accent/20 bg-accent/5">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Users2 className="w-8 h-8 text-accent" />
            <div className="text-3xl font-black text-foreground">{subscriptionStats.membersCount}</div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">AKTIIVISET JÄSENET</p>
          </CardContent>
        </Card>
        <Card className="industrial-card border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Banknote className="w-8 h-8 text-accent" />
            <div className="text-3xl font-black text-foreground">{subscriptionStats.totalCost.toFixed(2)} €</div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">KUUKAUSI-TILAUS</p>
          </CardContent>
        </Card>
        <Card className="industrial-card">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Shield className="w-8 h-8 text-accent opacity-40" />
            <div className="text-xs font-black text-foreground uppercase tracking-widest">LISENSSI: PRO</div>
            <p className="text-[10px] font-black uppercase text-green-500 tracking-widest">AKTIIVINEN</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-black/40 border border-white/5 p-1 h-14 mb-8">
          <TabsTrigger value="billing" className="gap-2 font-black uppercase text-[10px]"><Banknote className="w-4 h-4" /> Laskutus</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 font-black uppercase text-[10px]"><Settings className="w-4 h-4" /> Yleiset</TabsTrigger>
          <TabsTrigger value="order" className="gap-2 font-black uppercase text-[10px]"><LayoutGrid className="w-4 h-4" /> Järjestys</TabsTrigger>
          <TabsTrigger value="security" className="gap-2 font-black uppercase text-[10px]"><Lock className="w-4 h-4" /> Suojaus</TabsTrigger>
        </TabsList>

        <TabsContent value="billing">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-accent font-black uppercase tracking-tight">Tilausyhteenveto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {ROLES.map(role => {
                const count = subscriptionStats.counts[role.id]
                if (count === 0 && role.id !== 'admin') return null
                return (
                  <div key={role.id} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="font-bold text-foreground">{role.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{role.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-accent">{count} x {role.price.toFixed(2)} €</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{(count * role.price).toFixed(2)} €/kk</p>
                    </div>
                  </div>
                )
              })}
              <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-lg font-black uppercase tracking-tighter">Yhteensä (ALV 0%)</span>
                <span className="text-3xl font-black text-accent">{subscriptionStats.totalCost.toFixed(2)} € / KK</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-accent font-black uppercase">Keittiöasetukset</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest"><Percent className="w-3 h-3 inline mr-2 text-accent" /> Tavoitekatetuotto (%)</Label>
                    <Input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="h-12 bg-black/40 font-black text-xl text-accent" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest"><Clock className="w-3 h-3 inline mr-2 text-accent" /> Tuntipalkka (€/h)</Label>
                    <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="h-12 bg-black/40 font-black text-xl text-accent" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest"><Globe className="w-3 h-3 inline mr-2 text-accent" /> Kieli</Label>
                    <Select value={language} onValueChange={setLanguage}><SelectTrigger className="h-12 bg-black/40"><SelectValue /></SelectTrigger><SelectContent className="bg-background"><SelectItem value="fi">Suomi</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest"><Coins className="w-3 h-3 inline mr-2 text-accent" /> Valuutta</Label>
                    <Select value={currency} onValueChange={setCurrency}><SelectTrigger className="h-12 bg-black/40"><SelectValue /></SelectTrigger><SelectContent className="bg-background"><SelectItem value="EUR">Euro (€)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select>
                  </div>
                </div>
              </div>
              <Button onClick={saveSettings} className="w-full copper-gradient text-white font-black h-14 uppercase tracking-widest text-xs mt-4">Tallenna muutokset</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-accent font-black uppercase">Valikon järjestys</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {moduleOrder.map((id, index) => {
                    const item = BASE_MENU_ITEMS.find(m => m.id === id); if (!item) return null
                    const isInfo = id === 'info'
                    return (
                      <div key={id} className={cn("flex items-center justify-between p-3 rounded-xl border border-white/5", isInfo ? "bg-primary/10 border-accent/20" : "bg-white/5")}>
                        <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-accent" /><span className="text-sm font-bold uppercase">{item.label}</span></div>
                        {!isInfo && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => moveModule(index, 'up')} disabled={index <= 1}><ChevronUp className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => moveModule(index, 'down')} disabled={index === moduleOrder.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              <Button onClick={saveModuleOrder} className="w-full copper-gradient text-white font-black h-14 uppercase tracking-widest text-xs">Tallenna järjestys</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
