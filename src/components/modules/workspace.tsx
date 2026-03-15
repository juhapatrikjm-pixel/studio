"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, CheckCircle, Info, ChefHat, CookingPot, Wrench, Send, Trash2, Clock, Zap, Target } from "lucide-react"
import { OmavalvontaStatusHeader } from "./omavalvonta"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, where, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { format, formatDistanceToNow } from "date-fns"
import { fi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function WorkspaceModule() {
  const firestore = useFirestore()
  const currentUser = "Käyttäjä"

  const [todayDate, setTodayDate] = useState<string | null>(null)

  useEffect(() => {
    setTodayDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  const shiftInfoQuery = useMemo(() => {
    if (!firestore || !todayDate) return null
    return query(
      collection(firestore, 'shiftInfos'), 
      where('date', '==', todayDate),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  }, [firestore, todayDate])
  
  const { data: shiftInfos = [] } = useCollection<any>(shiftInfoQuery)
  const shiftInfo = shiftInfos[0] || null

  const omavalvontaQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(1))
  }, [firestore])
  const { data: records = [] } = useCollection<any>(omavalvontaQuery)
  const latestRecord = records[0] || null

  const recipesQuery = useMemo(() => firestore ? query(collection(firestore, 'recipes'), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore])
  const dishesQuery = useMemo(() => firestore ? query(collection(firestore, 'dishes'), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore])
  
  const { data: latestRecipes = [] } = useCollection<any>(recipesQuery)
  const { data: latestDishes = [] } = useCollection<any>(dishesQuery)

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
    <div className="flex flex-col gap-1.5 animate-in fade-in duration-700 pb-10">
      <header className="flex flex-col gap-0.5 px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <h1 className="text-lg font-headline font-black copper-text-glow uppercase tracking-tighter">Ohjauspaneeli</h1>
        </div>
        <div className="flex items-center gap-2 opacity-60">
          <Badge variant="outline" className="border-green-500/50 text-green-500 font-black tracking-widest bg-green-500/5 px-1 py-0 h-3 text-[6px]">SYSTEM OK</Badge>
          <span className="text-[6px] uppercase font-bold tracking-widest">ID: wisemisa-d2b98</span>
        </div>
      </header>

      <OmavalvontaStatusHeader record={latestRecord} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
        <div className="lg:col-span-8 space-y-1.5">
          {shiftInfo && !isRead && (shiftInfo.bulletPoints?.length > 0 || shiftInfo.freeText) && (
            <Card className="industrial-card animate-breathing overflow-hidden border-accent/20">
              <div className="absolute top-0 left-0 w-full h-0.5 copper-gradient metal-shine-overlay" />
              <CardHeader className="flex flex-row items-center justify-between p-2 pb-1 space-y-0">
                <div className="flex items-center gap-2">
                  <Info className="w-2.5 h-2.5 text-accent" />
                  <CardTitle className="text-[8px] font-black text-accent uppercase tracking-widest">VUORO-INFO</CardTitle>
                </div>
                <Button onClick={markAsRead} size="sm" variant="ghost" className="h-4 px-1.5 text-[6px] font-black uppercase tracking-widest text-accent hover:bg-accent/10">
                  <CheckCircle className="w-2 h-2 mr-1" /> KUITTAA
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5 p-2 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {shiftInfo.bulletPoints?.map((p: string, i: number) => p && (
                    <div key={i} className="flex items-center gap-1.5 p-1 rounded-lg bg-white/5 border border-white/5">
                      <div className="w-1 h-1 rounded-full bg-accent" />
                      <span className="text-[8px] font-bold">{p}</span>
                    </div>
                  ))}
                </div>
                {shiftInfo.freeText && (
                  <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                    <p className="text-[8px] text-foreground/80 italic leading-tight whitespace-pre-wrap">{shiftInfo.freeText}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-0.5 steel-detail metal-shine-overlay" />
            <CardHeader className="p-2 pb-1">
              <CardTitle className="font-headline text-[8px] font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <Wrench className="w-3 h-3" /> HUOLLOT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-2">
              <div className="flex gap-1.5">
                <Input 
                  placeholder="Kirjaa huolto..." 
                  value={newMaintenanceText}
                  onChange={(e) => setNewMaintenanceText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMaintenanceNote()}
                  className="bg-white/5 border-white/10 h-7 text-[8px] rounded-lg"
                />
                <Button onClick={addMaintenanceNote} className="copper-gradient h-7 px-2">
                  <Send className="w-2.5 h-2.5" />
                </Button>
              </div>
              
              <ScrollArea className="h-[80px] pr-2">
                <div className="space-y-1">
                  {maintenanceNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-1 rounded-lg bg-white/5 border border-white/5 hover:border-accent/20 transition-all group">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-0.5 h-3 copper-gradient rounded-full shrink-0" />
                        <div className="truncate">
                          <p className="text-[8px] font-bold text-foreground truncate">{note.text}</p>
                          <p className="text-[5px] text-muted-foreground uppercase font-black tracking-widest">{note.createdAt ? format(note.createdAt.toDate(), 'd.M. HH:mm') : 'Nyt'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMaintenanceNote(note.id)} className="h-4 w-4 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 className="w-2 h-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-1.5">
          <Card className="industrial-card">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="font-headline text-[7px] font-black text-accent uppercase tracking-[0.2em]">LOKI</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-1">
                {combinedLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-1.5 p-1 rounded-lg bg-white/5 border border-transparent hover:bg-white/10 transition-all group">
                    <div className="w-4 h-4 rounded bg-black/40 flex items-center justify-center border border-white/10 shrink-0">
                      <log.icon className="w-2 h-2 text-accent" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[7px] font-black text-foreground leading-tight truncate">{log.text}</p>
                      <p className="text-[5px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                        {log.time ? formatDistanceToNow(new Date(log.time), { addSuffix: true, locale: fi }) : 'Äsken'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-1.5">
            <Card className="industrial-card bg-primary/5 border-primary/20">
              <CardContent className="p-1.5 flex flex-col items-center justify-center text-center gap-0.5">
                <Users className="w-2 h-2 text-accent mb-0.5" />
                <div className="text-base font-black text-foreground leading-none">12</div>
                <p className="text-[5px] text-green-500 font-black uppercase tracking-widest">AKTIIVI</p>
              </CardContent>
            </Card>
            <Card className="industrial-card bg-white/5 border-white/10">
              <CardContent className="p-1.5 flex flex-col items-center justify-center text-center gap-0.5">
                <Cloud className="w-2 h-2 text-accent mb-0.5" />
                <div className="text-base font-black text-foreground leading-none">84%</div>
                <p className="text-[5px] text-muted-foreground font-black uppercase tracking-widest">DATA</p>
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
