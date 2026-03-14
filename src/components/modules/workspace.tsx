
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, CheckCircle, Info, ChefHat, CookingPot, Wrench, Send, Trash2, Clock } from "lucide-react"
import { OmavalvontaStatusHeader } from "./omavalvonta"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, where, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { format, formatDistanceToNow } from "date-fns"
import { fi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export function WorkspaceModule() {
  const firestore = useFirestore()
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const currentUser = "John Smith"

  // Haetaan päivän viimeisin vuoro-info
  const shiftInfoQuery = useMemo(() => {
    if (!firestore) return null
    return query(
      collection(firestore, 'shiftInfos'), 
      where('date', '==', todayDate),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  }, [firestore, todayDate])
  
  const { data: shiftInfos = [] } = useCollection<any>(shiftInfoQuery)
  const shiftInfo = shiftInfos[0] || null

  // Omavalvonta-status
  const omavalvontaQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(1))
  }, [firestore])
  const { data: records = [] } = useCollection<any>(omavalvontaQuery)
  const latestRecord = records[0] || null

  // Dynaamiset toimintalokit: Reseptit ja Annokset
  const recipesQuery = useMemo(() => firestore ? query(collection(firestore, 'recipes'), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore])
  const dishesQuery = useMemo(() => firestore ? query(collection(firestore, 'dishes'), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore])
  
  const { data: latestRecipes = [] } = useCollection<any>(recipesQuery)
  const { data: latestDishes = [] } = useCollection<any>(dishesQuery)

  // Huolto-ilmoitukset
  const maintenanceQuery = useMemo(() => firestore ? query(collection(firestore, 'maintenanceNotes'), orderBy('createdAt', 'desc'), limit(10)) : null, [firestore])
  const { data: maintenanceNotes = [] } = useCollection<any>(maintenanceQuery)
  
  const [newMaintenanceText, setNewMaintenanceText] = useState("")
  const [readInfoIds, setReadInfoIds] = useState<string[]>([])

  const isRead = useMemo(() => {
    if (!shiftInfo) return false
    return shiftInfo.acknowledgedBy?.includes(currentUser) || readInfoIds.includes(shiftInfo.id)
  }, [shiftInfo, currentUser, readInfoIds])

  const markAsRead = () => {
    if (!firestore || !shiftInfo) return
    setReadInfoIds(prev => [...prev, shiftInfo.id])
    const docRef = doc(firestore, 'shiftInfos', shiftInfo.id)
    updateDoc(docRef, {
      acknowledgedBy: arrayUnion(currentUser)
    })
  }

  const addMaintenanceNote = () => {
    if (!newMaintenanceText.trim() || !firestore) return
    addDoc(collection(firestore, 'maintenanceNotes'), {
      text: newMaintenanceText,
      createdAt: serverTimestamp(),
      createdBy: currentUser,
      status: 'active'
    })
    setNewMaintenanceText("")
  }

  const deleteMaintenanceNote = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'maintenanceNotes', id))
  }

  // Yhdistetään ja järjestetään lokit
  const combinedLogs = useMemo(() => {
    const logs = [
      ...latestRecipes.map(r => ({
        id: r.id,
        text: `Uusi resepti: ${r.name}`,
        time: r.createdAt,
        type: 'recipe',
        icon: ChefHat
      })),
      ...latestDishes.map(d => ({
        id: d.id,
        text: `Uusi annos: ${d.name}`,
        time: d.createdAt,
        type: 'dish',
        icon: CookingPot
      }))
    ]
    return logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)
  }, [latestRecipes, latestDishes])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-bold text-accent">Ohjauspaneeli</h1>
        <p className="text-muted-foreground">Toiminnan tila: <span className="text-green-500 font-bold">OPTIMOITU</span></p>
      </header>

      <OmavalvontaStatusHeader record={latestRecord} />

      {shiftInfo && !isRead && (shiftInfo.bulletPoints?.length > 0 || shiftInfo.freeText) && (
        <Card className="bg-accent/10 border-accent/40 shadow-xl relative overflow-hidden animate-in slide-in-from-right duration-700">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-headline text-accent flex items-center gap-2">
                <Info className="w-5 h-5" /> Tärkeää tälle vuorolle
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                Vastaa ja kuittaa luetuksi
              </CardDescription>
            </div>
            <Button onClick={markAsRead} size="sm" variant="outline" className="gap-2 border-accent/20 text-accent hover:bg-accent/10">
              <CheckCircle className="w-4 h-4" /> Luettu
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {shiftInfo.bulletPoints?.length > 0 && (
              <ul className="space-y-1">
                {shiftInfo.bulletPoints.map((p: string, i: number) => p && (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {shiftInfo.freeText && (
              <p className="text-sm text-foreground/80 italic border-l-2 border-accent/20 pl-4 py-1 whitespace-pre-wrap">
                {shiftInfo.freeText}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Huolto-osio (UUSI) */}
      <Card className="bg-card border-border shadow-xl border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 steel-detail opacity-50" />
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-lg text-accent flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Huollot & Ilmoitukset
          </CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Päivitä laitteiston ja huollon tilanne</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Esim. Uunin huolto tilattu..." 
              value={newMaintenanceText}
              onChange={(e) => setNewMaintenanceText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMaintenanceNote()}
              className="bg-muted/30 border-border text-sm"
            />
            <Button onClick={addMaintenanceNote} className="copper-gradient"><Send className="w-4 h-4" /></Button>
          </div>
          
          <ScrollArea className="h-[120px]">
            <div className="space-y-2">
              {maintenanceNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-border/50 group animate-in slide-in-from-left-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-accent/40 rounded-full" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{note.text}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{note.createdAt ? format(note.createdAt.toDate(), 'd.M. HH:mm') : 'Nyt'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMaintenanceNote(note.id)} className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {maintenanceNotes.length === 0 && (
                <p className="text-center py-8 text-[10px] text-muted-foreground uppercase italic tracking-widest">Ei aktiivisia huoltoilmoituksia</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Toimintalokit (DYNAAMINEN) */}
        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-lg text-accent">Toimintalokit</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Uusimmat päivitykset keittiöstä</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {combinedLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-transparent hover:border-primary/20 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:bg-primary/20 transition-colors">
                    <log.icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{log.text}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        {formatDistanceToNow(new Date(log.time), { addSuffix: true, locale: fi })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {combinedLogs.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic text-xs">
                  Ei viimeaikaisia tapahtumia.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suojaus ja kapasiteetti */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tiimin koko</CardTitle>
                <Users className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-foreground">12</div>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter mt-1">Aktiivisessa vuorossa</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Arkisto</CardTitle>
                <Cloud className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-foreground">84%</div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Tallennustilaa jäljellä</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border shadow-xl animate-breathing border-primary/20">
            <CardHeader>
              <CardTitle className="font-headline text-lg text-accent">Ydinjärjestelmän tila</CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Suojaus ja valvonta</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
                <span className="text-xs font-bold uppercase tracking-widest">RSA 4096 salaus</span>
                <Badge variant="outline" className="border-green-500 text-green-500 font-bold bg-green-500/10">AKTIIVINEN</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
                <span className="text-xs font-bold uppercase tracking-widest">Yhteyspalvelin</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-xs font-bold text-green-500 uppercase">Yhdistetty</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
