
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Smile, Sparkles, Save, Info, CheckCircle } from "lucide-react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const DEFAULT_CHEERS = [
  "Kokki on keittiön kuningas! 👑",
  "Tänään on loistava päivä tehdä taikuutta lautasella! ✨",
  "Pidetään veitset terävinä ja mieli kirkkaana! 🔪",
  "Keittiössä ei hikoilla, siellä loistetaan! 💪",
  "Mise en place on puoli voittoa! 🔥",
  "Tänään jokainen annos on mestariteos! 🎨",
  "Parasta ruokaa, parhaalla asenteella! 🥘",
  "Keittiötiimi on perhe! ❤️",
  "Hymyile, asiakkaat maistavat rakkauden ruoassa! 😊",
  "Tänään vedetään täysillä, kuten aina! 🚀",
  "Älä stressaa, tee parhaasi! ✨",
  "Kaikki kontrollissa, tilauslappuja tulee! 📝",
  "Muista juoda vettä, kokki! 🥤",
  "Keittiö on elämäntapa! 🤘",
  "Tänään on hyvä päivä loistaa! 🌟",
  "Nyt mennään eikä meinata! 🔥",
  "Puhdas keittiö, puhdas mieli! 🧼",
  "Tiimityö on keittiön suola! 🧂",
  "Olet rautainen ammattilainen! ⚒️",
  "Tsemppiä vuoroon, sä hoidat tän! 🤜🤛",
  "Keittiöhuumori on parasta huumoria! 😂",
  "Liesi kuumana, sydän lämpimänä! ❤️",
  "Tänään yllätetään itsemme! 🌈",
  "Kiire on vain asennekysymys! ⏱️",
  "Jokainen lautanen on käyntikorttisi! 🎫",
  "Pidetään maku kohdillaan! 👅",
  "Ruoanlaitto on intohimo! 🍷",
  "Olet keittiön sankari! 🦸",
  "Tänään ei paleta mikään pohjaan! 🍳",
  "Kaikki rullaa kuin rasvattu! 🧈",
  "Keittiö on teatteri, sinä olet tähti! 🎭",
  "Olet tehokas kuin Rational! 🌪️",
  "Positiivisuus on tarttuvaa! 🦠 (hyvällä tavalla)",
  "Tänään luodaan muistoja! 📸",
  "Kupari kiiltää ja pataan porisee! ✨",
  "Anna mennä, kokki! ⚡",
  "Olet korvaamaton osa tätä tiimiä! 🧩",
  "Tämä vuoro on sun! 🏆",
  "Luo jotain uutta tänään! 💡",
  "Keittiö elää ja hengittää kanssasi! 🌬️"
]

export function ShiftInfoModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const dateId = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  
  const infoRef = useMemo(() => (firestore ? doc(firestore, 'shiftInfos', dateId) : null), [firestore, dateId])
  const { data: shiftInfo } = useDoc<any>(infoRef)
  
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const { data: settings } = useDoc<any>(settingsRef)

  const [points, setPoints] = useState<string[]>([])
  const [freeText, setFreeText] = useState("")
  const [cheer, setCheer] = useState("Paina hymynaamaa tsempin saamiseksi! 😊")

  useEffect(() => {
    if (shiftInfo) {
      setPoints(shiftInfo.bulletPoints || [])
      setFreeText(shiftInfo.freeText || "")
    }
  }, [shiftInfo])

  const saveInfo = () => {
    if (!firestore || !infoRef) return
    setDoc(infoRef, {
      date: dateId,
      bulletPoints: points,
      freeText: freeText,
      acknowledgedBy: shiftInfo?.acknowledgedBy || []
    }, { merge: true }).then(() => {
      toast({ title: "Vuoro-info tallennettu", description: "Tiedot päivitetty pilveen." })
    })
  }

  const addPoint = () => setPoints([...points, ""])
  const updatePoint = (index: number, val: string) => {
    const newPoints = [...points]
    newPoints[index] = val
    setPoints(newPoints)
  }
  const removePoint = (index: number) => setPoints(points.filter((_, i) => i !== index))

  const generateCheer = () => {
    const messages = settings?.cheerMessages?.length > 0 ? settings.cheerMessages : DEFAULT_CHEERS
    const randomIndex = Math.floor(Math.random() * messages.length)
    setCheer(messages[randomIndex])
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-headline font-bold text-accent">Vuoro-info</h2>
          <p className="text-muted-foreground">Päivän tärkeät merkinnät ja tiimitiedotus.</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={generateCheer}
          className="w-12 h-12 rounded-full hover:bg-accent/10 text-accent transition-transform active:scale-90"
        >
          <Smile className="w-8 h-8" />
        </Button>
      </header>

      <Card className="bg-primary/5 border-primary/20 animate-breathing">
        <CardContent className="p-6 flex items-center gap-4">
          <Sparkles className="w-6 h-6 text-accent shrink-0" />
          <p className="text-lg font-headline font-bold text-accent italic">{cheer}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Info className="w-5 h-5 text-accent" />
              Päivän nostot
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
              Lisää varaukset, toimitukset ja erityishuomiot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {points.map((p, i) => (
                <div key={i} className="flex gap-2 group">
                  <Input 
                    value={p} 
                    onChange={(e) => updatePoint(i, e.target.value)}
                    placeholder="Esim. Klo 12 varaus 25 hlö..."
                    className="bg-muted/30 border-border"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePoint(i)} className="opacity-0 group-hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={addPoint} variant="outline" className="w-full border-dashed border-accent/40 text-accent hover:bg-accent/5">
                <Plus className="w-4 h-4 mr-2" /> Lisää rivi
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              Vapaa muistio
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
              Kirjoita pidempiä huomioita vuorolle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Kirjoita tähän..."
              className="min-h-[200px] bg-muted/30 border-border"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={saveInfo} size="lg" className="copper-gradient text-white font-bold w-full max-w-md h-12 shadow-lg">
          <Save className="w-5 h-5 mr-2" /> Tallenna vuoro-info
        </Button>
      </div>
    </div>
  )
}
