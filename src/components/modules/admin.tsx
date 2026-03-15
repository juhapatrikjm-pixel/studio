
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Shield, Settings, Lock, Percent, Smile, Plus, Trash2, Banknote, Clock, Users2, CreditCard, LayoutGrid, ChevronUp, ChevronDown, Globe, Coins, Scale } from "lucide-react"
import { useFirestore, useDoc, useCollection, useUser } from "@/firebase"
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { BASE_MENU_ITEMS } from "@/app/page"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES = [
  { id: 'admin', name: 'Ylläpitäjä', kitchenTitle: 'Keittiömestari', price: 24.90, priceStr: '24,90 €/kk', desc: 'Täydet oikeudet hallintaan, talouteen ja asetuksiin.' },
  { id: 'power', name: 'Pääkäyttäjä', kitchenTitle: 'Vuoromestari', price: 6.90, priceStr: '6,90 €/kk', desc: 'Oikeus hallita listoja, tilauksia ja vuoro-infoja.' },
  { id: 'editor', name: 'Muokkaaja', kitchenTitle: 'Kokki', price: 4.90, priceStr: '4,90 €/kk', desc: 'Oikeus kuitata tehtäviä ja muokata reseptejä.' },
  { id: 'viewer', name: 'Katselija', kitchenTitle: 'Apuhenkilöstö', price: 4.90, priceStr: '4,90 €/kk', desc: 'Luku-oikeus listoihin ja reseptiikkaan.' },
]

const LANGUAGES = [
  { id: 'fi', name: 'Suomi' }, { id: 'en', name: 'English' }, { id: 'sv', name: 'Svenska' }, { id: 'et', name: 'Eesti' }, { id: 'ru', name: 'Pусский' },
]

const CURRENCIES = [
  { id: 'EUR', name: 'Euro (€)', symbol: '€' }, { id: 'USD', name: 'US Dollar ($)', symbol: '$' }, { id: 'GBP', name: 'British Pound (£)', symbol: '£' }, { id: 'SEK', name: 'Swedish Krona (kr)', symbol: 'kr' }, { id: 'RUB', name: 'Russian Ruble (₽)', symbol: '₽' },
]

const WEIGHT_UNITS = [
  { id: 'kg/g', name: 'Kilogrammat & Grammat (kg/g)' }, { id: 'lb/oz', name: 'Pounds & Ounces (lb/oz)' }, { id: 'g', name: 'Grammat (g)' }, { id: 'oz', name: 'Ounces (oz)' },
]

export function AdminModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const userId = user?.uid || "unknown"
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const profileRef = useMemo(() => (firestore ? doc(firestore, 'userProfiles', userId) : null), [firestore, userId])
  
  const { data: settings } = useDoc<any>(settingsRef)
  const { data: profile } = useDoc<any>(profileRef)

  const contactsRef = useMemo(() => (firestore ? collection(firestore, 'contacts') : null), [firestore])
  const { data: contacts = [] } = useCollection<any>(contactsRef)

  const [targetMargin, setTargetMargin] = useState(75)
  const [hourlyRate, setHourlyRate] = useState(22)
  const [language, setLanguage] = useState('fi')
  const [currency, setCurrency] = useState('EUR')
  const [weightUnit, setWeightUnit] = useState('kg/g')
  const [messages, setMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [moduleOrder, setModuleOrder] = useState<string[]>([])

  useEffect(() => {
    if (settings) {
      if (settings.targetMargin) setTargetMargin(settings.targetMargin)
      if (settings.hourlyRate) setHourlyRate(settings.hourlyRate)
      if (settings.cheerMessages) setMessages(settings.cheerMessages)
      if (settings.language) setLanguage(settings.language)
      if (settings.currency) setCurrency(settings.currency)
      if (settings.weightUnit) setWeightUnit(settings.weightUnit)
    }
  }, [settings])

  useEffect(() => {
    if (profile) {
      if (profile.moduleOrder) {
        setModuleOrder(profile.moduleOrder)
      } else {
        setModuleOrder(BASE_MENU_ITEMS.map(m => m.id))
      }
    } else {
      setModuleOrder(BASE_MENU_ITEMS.map(m => m.id))
    }
  }, [profile])

  const teamStats = useMemo(() => {
    const activeMembers = contacts.filter(c => c.isTeamMember)
    const counts: Record<string, number> = { admin: 0, power: 0, editor: 0, viewer: 0 }
    let totalCost = 0
    activeMembers.forEach(member => {
      const roleObj = ROLES.find(r => r.kitchenTitle === member.role)
      if (roleObj) { counts[roleObj.id]++; totalCost += roleObj.price; }
    })
    return { counts, totalCost, totalMembers: activeMembers.length }
  }, [contacts])

  const saveSettings = () => {
    if (!firestore || !settingsRef) return
    setDoc(settingsRef, { 
      targetMargin: Number(targetMargin),
      hourlyRate: Number(hourlyRate),
      language, currency, weightUnit,
      cheerMessages: messages
    }, { merge: true }).then(() => {
      toast({ title: "Asetukset tallennettu" })
    })
  }

  const saveModuleOrder = () => {
    if (!profileRef) return
    setDoc(profileRef, { moduleOrder, updatedAt: serverTimestamp() }, { merge: true }).then(() => {
      toast({ title: "Järjestys tallennettu" })
    })
  }

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...moduleOrder]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index === 0 || targetIndex === 0 || targetIndex < 0 || targetIndex >= newOrder.length) return
    const temp = newOrder[index]; newOrder[index] = newOrder[targetIndex]; newOrder[targetIndex] = temp;
    setModuleOrder(newOrder)
  }

  const addMessage = () => {
    if (!newMessage.trim()) return
    setMessages([...messages, newMessage]); setNewMessage("")
  }

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-headline font-bold text-primary">Hallinta</h2>
        <p className="text-muted-foreground">Hallitse tiimejä ja sovelluksen asetuksia.</p>
      </header>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full bg-black/40 border border-white/5 p-1 h-auto mb-8">
          {[
            { id: 'settings', icon: Settings, label: 'Yleiset' },
            { id: 'order', icon: LayoutGrid, label: 'Järjestys' },
            { id: 'cheers', icon: Smile, label: 'Tsempit' },
            { id: 'teams', icon: Users2, label: 'Tiimi' },
            { id: 'roles', icon: Shield, label: 'Oikeudet' },
            { id: 'security', icon: Lock, label: 'Suojaus' },
          ].map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-primary/20 data-[state=active]:text-accent rounded-lg">
              <tab.icon className="w-5 h-5" />
              <span className="font-black uppercase text-[8px] tracking-[0.1em]">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="settings">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader><CardTitle className="text-accent">Sovelluksen asetukset</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2"><Percent className="w-4 h-4 text-accent" /> Tavoitekatetuotto (%)</Label>
                    <Input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-black/40 border-white/10 h-12 font-black text-xl text-accent" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Tuntipalkka (€/h)</Label>
                    <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="bg-black/40 border-white/10 h-12 font-black text-xl text-accent" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Kieli</Label>
                    <Select value={language} onValueChange={setLanguage}><SelectTrigger className="bg-black/40 h-12"><SelectValue /></SelectTrigger><SelectContent className="bg-background">
                      {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2"><Coins className="w-4 h-4 text-accent" /> Valuutta</Label>
                    <Select value={currency} onValueChange={setCurrency}><SelectTrigger className="bg-black/40 h-12"><SelectValue /></SelectTrigger><SelectContent className="bg-background">
                      {CURRENCIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                </div>
              </div>
              <Button onClick={saveSettings} className="w-full max-w-sm mx-auto flex copper-gradient text-white font-black h-14 mt-8">TALLENNA ASETUKSET</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-accent flex items-center gap-3"><LayoutGrid className="w-6 h-6" /> Järjestys</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {moduleOrder.map((id, index) => {
                    const item = BASE_MENU_ITEMS.find(m => m.id === id); if (!item) return null;
                    const isInfo = id === 'info'
                    return (
                      <div key={id} className={cn("flex items-center justify-between p-3 rounded-xl border border-white/5", isInfo ? "bg-primary/10 border-accent/20" : "bg-white/5")}>
                        <div className="flex items-center gap-3"><item.icon className="w-4 h-4 text-accent" /><span className="text-xs font-bold">{item.label}</span></div>
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
              <Button onClick={saveModuleOrder} className="w-full copper-gradient text-white font-black h-14 uppercase tracking-widest text-xs">TALLENNA JÄRJESTYS</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
