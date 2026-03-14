
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Shield, UserCog, Settings, Lock, Percent, Smile, Plus, Trash2 } from "lucide-react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AdminModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const { data: settings } = useDoc<any>(settingsRef)

  const [targetMargin, setTargetMargin] = useState(75)
  const [messages, setMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    if (settings) {
      if (settings.targetMargin) setTargetMargin(settings.targetMargin)
      if (settings.cheerMessages) setMessages(settings.cheerMessages)
    }
  }, [settings])

  const saveSettings = () => {
    if (!firestore || !settingsRef) return
    setDoc(settingsRef, { 
      targetMargin: Number(targetMargin),
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
        <TabsList className="grid w-full grid-cols-5 mb-6 bg-white border border-accent/10">
          <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> Yleiset</TabsTrigger>
          <TabsTrigger value="cheers" className="gap-2"><Smile className="w-4 h-4" /> Tsempit</TabsTrigger>
          <TabsTrigger value="teams" className="gap-2"><UserCog className="w-4 h-4" /> Tiimi</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="w-4 h-4" /> Oikeudet</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="w-4 h-4" /> Suojaus</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Sovelluksen asetukset</CardTitle>
              <CardDescription>Määritä koko järjestelmän kattavia parametreja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-sm">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-accent" />
                  Reseptiikan tavoitekatetuotto (%)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={targetMargin} 
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="bg-muted/30"
                  />
                  <Button onClick={saveSettings} className="copper-gradient">Tallenna</Button>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Tätä arvoa käytetään annosten hinnoittelun visuaalisessa seurannassa.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cheers">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tsemppiviestit</CardTitle>
              <CardDescription>Muokkaa keittiön pääsiäismunan jakamia hyvän mielen viestejä.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Uusi tsemppiviesti..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-muted/30"
                />
                <Button onClick={addMessage} className="copper-gradient"><Plus className="w-4 h-4" /></Button>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/10 group">
                      <span className="text-sm">{m}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeMessage(i)} className="opacity-0 group-hover:opacity-100 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground italic">Käytetään oletusviestejä.</p>
                  )}
                </div>
              </ScrollArea>
              
              <Button onClick={saveSettings} className="w-full copper-gradient">Tallenna viestikirjasto</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tiimin organisaatio</CardTitle>
              <CardDescription>Määritä, miten tiimisi on rakentunut sovelluksessa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Salli tiimin alaryhmät</Label>
                  <p className="text-sm text-muted-foreground">Mahdollistaa osastoille omien eristettyjen työtilojen luomisen.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Julkinen hakemisto</Label>
                  <p className="text-sm text-muted-foreground">Näytä kaikki jäsenet yhteystietoluettelossa oletuksena.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Roolimääritykset</CardTitle>
              <CardDescription>Määritä ja hallitse käyttäjien pääsytasoja.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Ylläpitäjä', 'Muokkaaja', 'Katselija', 'Ulkoinen vieras'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20">
                    <span className="font-medium text-sm">{role}</span>
                    <Button variant="outline" size="sm" className="h-8">Muokkaa</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Yritystason suojaus</CardTitle>
              <CardDescription>Määritä korkean tason suojauskäytännöt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Kaksivaiheinen tunnistautuminen</Label>
                  <p className="text-sm text-muted-foreground">Vaadi 2FA kaikilta tiimin jäseniltä.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Etätyhjennys</Label>
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
