
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Shield, UserCog, Settings, Lock, Percent, Smile, Plus, Trash2, Banknote, Clock, BadgeEuro, Users2 } from "lucide-react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const ROLES = [
  { 
    id: 'admin', 
    name: 'Ylläpitäjä', 
    kitchenTitle: 'Keittiömestari', 
    price: '24,90 €/kk',
    desc: 'Täydet oikeudet hallintaan, talouteen ja asetuksiin.'
  },
  { 
    id: 'power', 
    name: 'Pääkäyttäjä', 
    kitchenTitle: 'Vuoromestari', 
    price: '6,90 €/kk',
    desc: 'Oikeus hallita listoja, tilauksia ja vuoro-infoja.'
  },
  { 
    id: 'editor', 
    name: 'Muokkaaja', 
    kitchenTitle: 'Kokki', 
    price: '4,90 €/kk',
    desc: 'Oikeus kuitata tehtäviä ja muokata reseptejä.'
  },
  { 
    id: 'viewer', 
    name: 'Katselija', 
    kitchenTitle: 'Apuhenkilöstö', 
    price: '4,90 €/kk',
    desc: 'Luku-oikeus listoihin ja reseptiikkaan.'
  },
]

export function AdminModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const { data: settings } = useDoc<any>(settingsRef)

  const [targetMargin, setTargetMargin] = useState(75)
  const [hourlyRate, setHourlyRate] = useState(22)
  const [messages, setMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    if (settings) {
      if (settings.targetMargin) setTargetMargin(settings.targetMargin)
      if (settings.hourlyRate) setHourlyRate(settings.hourlyRate)
      if (settings.cheerMessages) setMessages(settings.cheerMessages)
    }
  }, [settings])

  const saveSettings = () => {
    if (!firestore || !settingsRef) return
    setDoc(settingsRef, { 
      targetMargin: Number(targetMargin),
      hourlyRate: Number(hourlyRate),
      cheerMessages: messages
    }, { merge: true })
      .then(() => {
        toast({
          title: "Asetukset tallennettu",
          description: "Muutokset on päivitetty järjestelmään.",
        })
      })
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
        <TabsList className="grid w-full grid-cols-5 mb-6 bg-black/40 border border-white/5 p-1 h-12">
          <TabsTrigger value="settings" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent"><Settings className="w-4 h-4" /> Yleiset</TabsTrigger>
          <TabsTrigger value="cheers" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent"><Smile className="w-4 h-4" /> Tsempit</TabsTrigger>
          <TabsTrigger value="teams" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent"><Users2 className="w-4 h-4" /> Tiimi</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent"><Shield className="w-4 h-4" /> Oikeudet</TabsTrigger>
          <TabsTrigger value="security" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent"><Lock className="w-4 h-4" /> Suojaus</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <CardTitle className="font-headline text-accent">Sovelluksen asetukset</CardTitle>
              <CardDescription>Määritä koko järjestelmän kattavia parametreja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4 max-w-sm">
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
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Käytetään annosten hinnoittelun seurannassa.</p>
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
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Käytetään palkkakulujen laskentaan Tulos-sivulla.</p>
                </div>

                <Button onClick={saveSettings} className="w-full copper-gradient text-white font-black h-12 shadow-lg">TALLENNA ASETUKSET</Button>
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

        <TabsContent value="roles">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline text-accent text-2xl uppercase tracking-tight">Roolimääritykset ja Hinnoittelu</CardTitle>
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
                        <div className="text-accent font-black text-lg">{role.price}</div>
                        <p className="text-[8px] text-muted-foreground uppercase font-bold">Alv 0%</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-6 line-clamp-2 relative z-10">{role.desc}</p>
                    
                    <div className="flex gap-2 mt-auto relative z-10">
                      <Button variant="outline" size="sm" className="flex-1 h-9 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Hallitse oikeuksia</Button>
                      <Button className="copper-gradient h-9 px-4 text-white"><BadgeEuro className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                <Shield className="w-6 h-6 text-accent shrink-0" />
                <p className="text-[10px] text-muted-foreground uppercase font-medium leading-relaxed">
                  Huom: Hinnoittelu perustuu aktiivisiin käyttäjiin. Keittiömestari-tason lisenssi vaaditaan vähintään yhdelle käyttäjälle per toimipiste.
                </p>
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
