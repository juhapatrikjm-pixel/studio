
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Shield, Settings, Lock, Percent, Smile, Plus, Trash2, Banknote, Clock, Users2, CreditCard, LayoutGrid, ChevronUp, ChevronDown, Globe, Coins, Scale } from "lucide-react"
import { useFirestore, useDoc, useCollection } from "@/firebase"
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { BASE_MENU_ITEMS } from "@/app/page"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES = [
  { 
    id: 'admin', 
    name: 'Ylläpitäjä', 
    kitchenTitle: 'Keittiömestari', 
    price: 24.90,
    priceStr: '24,90 €/kk',
    desc: 'Täydet oikeudet hallintaan, talouteen ja asetuksiin.'
  },
  { 
    id: 'power', 
    name: 'Pääkäyttäjä', 
    kitchenTitle: 'Vuoromestari', 
    price: 6.90,
    priceStr: '6,90 €/kk',
    desc: 'Oikeus hallita listoja, tilauksia ja vuoro-infoja.'
  },
  { 
    id: 'editor', 
    name: 'Muokkaaja', 
    kitchenTitle: 'Kokki', 
    price: 4.90,
    priceStr: '4,90 €/kk',
    desc: 'Oikeus kuitata tehtäviä ja muokata reseptejä.'
  },
  { 
    id: 'viewer', 
    name: 'Katselija', 
    kitchenTitle: 'Apuhenkilöstö', 
    price: 4.90,
    priceStr: '4,90 €/kk',
    desc: 'Luku-oikeus listoihin ja reseptiikkaan.'
  },
]

const LANGUAGES = [
  { id: 'fi', name: 'Suomi' },
  { id: 'en', name: 'English' },
  { id: 'sv', name: 'Svenska' },
  { id: 'et', name: 'Eesti' },
  { id: 'ru', name: 'Pусский' },
]

const CURRENCIES = [
  { id: 'EUR', name: 'Euro (€)', symbol: '€' },
  { id: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { id: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { id: 'SEK', name: 'Swedish Krona (kr)', symbol: 'kr' },
  { id: 'RUB', name: 'Russian Ruble (₽)', symbol: '₽' },
]

const WEIGHT_UNITS = [
  { id: 'kg/g', name: 'Kilogrammat & Grammat (kg/g)' },
  { id: 'lb/oz', name: 'Pounds & Ounces (lb/oz)' },
  { id: 'g', name: 'Grammat (g)' },
  { id: 'oz', name: 'Ounces (oz)' },
]

export function AdminModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const userId = "demo-user-123"
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const profileRef = useMemo(() => (firestore ? doc(firestore, 'userProfiles', userId) : null), [firestore])
  
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

  // Lasketaan tiimin jäsenet ja kustannukset
  const teamStats = useMemo(() => {
    const activeMembers = contacts.filter(c => c.isTeamMember)
    const counts: Record<string, number> = { admin: 0, power: 0, editor: 0, viewer: 0 }
    let totalCost = 0

    activeMembers.forEach(member => {
      const roleObj = ROLES.find(r => r.kitchenTitle === member.role)
      if (roleObj) {
        counts[roleObj.id]++
        totalCost += roleObj.price
      }
    })

    return { counts, totalCost, totalMembers: activeMembers.length }
  }, [contacts])

  const saveSettings = () => {
    if (!firestore || !settingsRef) return
    setDoc(settingsRef, { 
      targetMargin: Number(targetMargin),
      hourlyRate: Number(hourlyRate),
      language,
      currency,
      weightUnit,
      cheerMessages: messages
    }, { merge: true })
      .then(() => {
        toast({
          title: "Asetukset tallennettu",
          description: "Muutokset on päivitetty järjestelmään.",
        })
      })
  }

  const saveModuleOrder = () => {
    if (!profileRef) return
    setDoc(profileRef, {
      moduleOrder,
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(() => {
        toast({
          title: "Järjestys tallennettu",
          description: "Työtilan moduulijärjestys on päivitetty.",
        })
      })
  }

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...moduleOrder]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (index === 0 || targetIndex === 0 || targetIndex < 0 || targetIndex >= newOrder.length) return

    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp
    setModuleOrder(newOrder)
  }

  const addMessage = () => {
    if (!newMessage.trim()) return
    setMessages([...messages, newMessage])
    setNewMessage("")
  }

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-headline font-bold text-primary">Hallinta</h2>
        <p className="text-muted-foreground">Hallitse tiimejä, käyttöoikeuksia ja sovelluksen asetuksia.</p>
      </header>

      <Tabs defaultValue="settings" className="w-full">
        <div className="w-full mb-8">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full bg-black/40 border border-white/5 p-1 h-auto gap-1">
            {[
              { id: 'settings', icon: Settings, label: 'Yleiset' },
              { id: 'order', icon: LayoutGrid, label: 'Järjestys' },
              { id: 'cheers', icon: Smile, label: 'Tsempit' },
              { id: 'teams', icon: Users2, label: 'Tiimi' },
              { id: 'roles', icon: Shield, label: 'Oikeudet' },
              { id: 'security', icon: Lock, label: 'Suojaus' },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 data-[state=active]:bg-primary/20 data-[state=active]:text-accent transition-all group rounded-lg"
              >
                <tab.icon className="w-5 h-5 group-data-[state=active]:scale-110 transition-transform" />
                <span className="font-black uppercase text-[8px] tracking-[0.1em] whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="settings">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <CardTitle className="font-headline text-accent">Sovelluksen asetukset</CardTitle>
              <CardDescription>Määritä koko järjestelmän kattavia parametreja ja kieli-asetuksia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Percent className="w-4 h-4 text-accent" />
                      Reseptiikan tavoitekatetuotto (%)
                    </Label>
                    <Input 
                      type="number" 
                      value={targetMargin} 
                      onChange={(e) => setTargetMargin(Number(e.target.value))}
                      className="bg-black/40 border-white/10 h-12 font-black text-xl text-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Clock className="w-4 h-4 text-accent" />
                      Tuntipalkka kuluineen (€/h)
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        value={hourlyRate} 
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="pl-10 bg-black/40 border-white/10 h-12 font-black text-xl text-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Globe className="w-4 h-4 text-accent" />
                      Sovelluksen kieli
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-12 font-bold text-foreground">
                        <SelectValue placeholder="Valitse kieli" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-white/10">
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.id} value={lang.id} className="text-sm font-bold">{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Coins className="w-4 h-4 text-accent" />
                      Käytettävä valuutta
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-12 font-bold text-foreground">
                        <SelectValue placeholder="Valitse valuutta" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-white/10">
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr.id} value={curr.id} className="text-sm font-bold">{curr.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Scale className="w-4 h-4 text-accent" />
                      Painomittojen yksikkö
                    </Label>
                    <Select value={weightUnit} onValueChange={setWeightUnit}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-12 font-bold text-foreground">
                        <SelectValue placeholder="Valitse yksikkö" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-white/10">
                        {WEIGHT_UNITS.map(unit => (
                          <SelectItem key={unit.id} value={unit.id} className="text-sm font-bold">{unit.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} className="w-full max-w-sm mx-auto flex copper-gradient text-white font-black h-14 shadow-lg metal-shine-overlay uppercase tracking-widest mt-8">
                TALLENNA KAIKKI ASETUKSET
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail" />
            <CardHeader>
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <LayoutGrid className="w-6 h-6" /> Moduulien järjestys
              </CardTitle>
              <CardDescription className="text-xs">Järjestä työtilan sivut itsellesi sopivimmaksi. Ohjauspaneeli pysyy aina ensimmäisenä.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {moduleOrder.map((id, index) => {
                    const menuItem = BASE_MENU_ITEMS.find(m => m.id === id)
                    if (!menuItem) return null
                    const isInfo = id === 'info'

                    return (
                      <div 
                        key={id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border border-white/5 transition-all shadow-inner",
                          isInfo ? "bg-primary/10 border-accent/20" : "bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-black/40", isInfo ? "text-accent" : "text-muted-foreground")}>
                            <menuItem.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", isInfo ? "text-accent" : "text-foreground")}>{menuItem.label}</p>
                            {isInfo && <p className="text-[8px] uppercase font-black text-accent/60">Kiinnitetty alkuun</p>}
                          </div>
                        </div>
                        
                        {!isInfo && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-accent disabled:opacity-20"
                              onClick={() => moveModule(index, 'up')}
                              disabled={index <= 1}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-accent disabled:opacity-20"
                              onClick={() => moveModule(index, 'down')}
                              disabled={index === moduleOrder.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              
              <div className="pt-4">
                <Button onClick={saveModuleOrder} className="w-full copper-gradient text-white font-black h-14 shadow-2xl metal-shine-overlay uppercase tracking-widest text-xs">
                  <Plus className="w-5 h-5" /> TALLENNA UUSI JÄRJESTYS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cheers">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <CardTitle className="font-headline text-accent">Tsemppiviestit</CardTitle>
              <CardDescription>Muokkaa keittiön pääsiäismunan jakamia hyvän mielen viestejä.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Uusi tsemppiviesti..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-black/40 border-white/10 h-12"
                />
                <Button onClick={addMessage} className="copper-gradient h-12 px-6"><Plus className="w-4 h-4" /></Button>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 group shadow-inner">
                      <span className="text-sm font-medium">{m}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeMessage(i)} className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground italic">Käytetään oletusviestejä.</p>
                  )}
                </div>
              </ScrollArea>
              
              <Button onClick={saveSettings} className="w-full copper-gradient text-white font-black h-12">TALLENNA VIESTIKIRJASTO</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card className="industrial-card">
                <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="font-headline text-accent text-2xl uppercase tracking-tight">Roolimääritykset</CardTitle>
                      <CardDescription>Määritä keittiön hierarkia ja käyttöoikeudet.</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-accent/20 text-accent font-black tracking-widest uppercase">Lisenssit</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ROLES.map((role) => (
                      <div key={role.id} className="flex flex-col p-5 rounded-2xl border border-white/5 bg-black/40 shadow-inner group transition-all hover:border-accent/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div>
                            <h3 className="font-headline font-black text-xl text-foreground uppercase tracking-tight">{role.kitchenTitle}</h3>
                            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{role.name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-accent font-black text-lg">{role.priceStr}</div>
                            <Badge variant="outline" className="text-[8px] border-accent/20 text-accent font-bold px-1 py-0">{teamStats.counts[role.id]} käytössä</Badge>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-6 line-clamp-2 relative z-10">{role.desc}</p>
                        
                        <div className="flex gap-2 mt-auto relative z-10">
                          <Button variant="outline" size="sm" className="flex-1 h-9 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Määritä oikeudet</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card className="industrial-card sticky top-24">
                <div className="absolute top-0 left-0 w-full h-1 steel-detail" />
                <CardHeader>
                  <CardTitle className="font-headline text-accent uppercase tracking-tight flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Kustannusyhteenveto
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Arvioitu kuukausiveloitus (Alv 0%)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {ROLES.map(role => teamStats.counts[role.id] > 0 && (
                      <div key={role.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{role.kitchenTitle}</span>
                          <span className="text-[10px] text-muted-foreground">{teamStats.counts[role.id]} x {role.priceStr}</span>
                        </div>
                        <span className="font-mono font-bold">{(teamStats.counts[role.id] * role.price).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-accent/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black uppercase text-muted-foreground">Yhteensä</span>
                      <span className="text-3xl font-headline font-black text-accent tabular-nums">{teamStats.totalCost.toFixed(2)} €</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic text-right">Seuraava laskutus: 1. päivä</p>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                    <Shield className="w-6 h-6 text-accent shrink-0" />
                    <p className="text-[10px] text-muted-foreground uppercase font-medium leading-relaxed">
                      Laskutus perustuu tiimin aktiivisiin jäseniin yhteystietolistassa.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail" />
            <CardHeader>
              <CardTitle className="font-headline text-accent">Tiimin organisaatio</CardTitle>
              <CardDescription>Määritä, miten tiimisi on rakentunut sovelluksessa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Salli tiimin alaryhmät</Label>
                  <p className="text-sm text-muted-foreground">Mahdollistaa osastoille omien eristettyjen työtilojen luomisen.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Julkinen hakemisto</Label>
                  <p className="text-sm text-muted-foreground">Näytä kaikki jäsenet yhteystietoluettelossa oletuksena.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail" />
            <CardHeader>
              <CardTitle className="font-headline text-accent">Yritystason suojaus</CardTitle>
              <CardDescription>Määritä korkean tason suojauskäytännöt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Kaksivaiheinen tunnistautuminen</Label>
                  <p className="text-sm text-muted-foreground">Vaadi 2FA kaikilta tiimin jäseniltä.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <Label className="text-base font-bold">Etätyhjennys</Label>
                  <p className="text-sm text-muted-foreground">Ylläpitäjät voivat tyhjentää sovellusdatan varastetuilta laitteilta.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
