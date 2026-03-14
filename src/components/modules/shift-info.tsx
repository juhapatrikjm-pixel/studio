
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Smile, Sparkles, Save, Info, History, Calendar as CalendarIcon, ChevronRight } from "lucide-react"
import { useFirestore, useDoc, useCollection } from "@/firebase"
import { collection, addDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  
  const historyQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'shiftInfos'), orderBy('createdAt', 'desc'), limit(20))
  }, [firestore])
  
  const { data: history = [] } = useCollection<any>(historyQuery)

  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const { data: settings } = useDoc<any>(settingsRef)

  const [points, setPoints] = useState<string[]>([])
  const [freeText, setFreeText] = useState("")
  const [cheer, setCheer] = useState("Paina hymiötä tsempin saamiseksi! 😊")

  const saveInfo = () => {
    if (!firestore || (!points.length && !freeText.trim())) return

    const infoData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      createdAt: serverTimestamp(),
      bulletPoints: points.filter(p => p.trim() !== ""),
      freeText: freeText,
      acknowledgedBy: []
    }

    const shiftInfosRef = collection(firestore, 'shiftInfos')

    addDoc(shiftInfosRef, infoData)
      .then(() => {
        toast({ 
          title: "Vuoro-info tallennettu", 
          description: "Merkintä on lisätty päivän historiaan ja tiedote näkyy ohjauspaneelissa.",
        })
        setPoints([])
        setFreeText("")
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: shiftInfosRef.path,
          operation: 'create',
          requestResourceData: infoData
        }))
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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
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
        <Card className="bg-card border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-30" />
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2 text-accent">
              <Info className="w-5 h-5" />
              Päivän nostot
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
              Lisää varaukset, toimitukset ja erityishuomiot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {points.map((p, i) => (
                <div key={i} className="flex gap-2 group animate-in slide-in-from-left-2 duration-300">
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

        <Card className="bg-card border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-30" />
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2 text-accent">
              <Plus className="w-5 h-5" />
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
        <Button 
          onClick={saveInfo} 
          size="lg" 
          disabled={!points.some(p => p.trim() !== "") && !freeText.trim()}
          className="copper-gradient text-white font-bold w-full max-w-md h-12 shadow-lg gap-2"
        >
          <Save className="w-5 h-5" /> Tallenna ja arkistoi vuoro-info
        </Button>
      </div>

      <div className="space-y-4 pt-10 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <History className="w-5 h-5" />
          <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Viimeisimmät vuoro-infot</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((entry) => (
            <Card key={entry.id} className="bg-card border-border hover:border-accent/40 transition-all group">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-headline text-accent flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {entry.date ? format(new Date(entry.date), 'EEEE d.M.yyyy', { locale: fi }) : "Merkintä"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {entry.bulletPoints?.map((p: string, idx: number) => p && (
                      <div key={idx} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                        <ChevronRight className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </div>
                    ))}
                    {entry.freeText && (
                      <p className="text-[10px] text-muted-foreground italic border-l border-accent/20 pl-2 mt-2 whitespace-pre-wrap">
                        {entry.freeText}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
          {history.length === 0 && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
              Ei aiempia arkistoituja vuoro-infoja.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
