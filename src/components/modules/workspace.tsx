"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, ChefHat, CookingPot, Wrench, Send, Trash2, CheckCircle, Zap } from "lucide-react"
import { OmavalvontaStatusHeader } from "./omavalvonta"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, where, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { format, formatDistanceToNow } from "date-fns"
import { fi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export function WorkspaceModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const currentUser = user?.displayName || (user?.isAnonymous ? "Ylläpitäjä" : "Käyttäjä")

  const [isMounted, setIsMounted] = useState(false)
  const [todayDate, setTodayDate] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [newMaintenanceText, setNewMaintenanceText] = useState("")
  const [readInfoIds, setReadInfoIds] = useState<string[]>([])

  useEffect(() => {
    setIsMounted(true)
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

  const isRead = useMemo(() => {
    if (!shiftInfo) return false
    return (shiftInfo.acknowledgedBy || []).includes(currentUser) || (shiftInfo.id && readInfoIds.includes(shiftInfo.id))
  }, [shiftInfo, currentUser, readInfoIds])

  const markAsRead = async () => {
    if (!firestore || !shiftInfo || !shiftInfo.id) return
    try {
      setReadInfoIds(prev => [...prev, shiftInfo.id])
      const docRef = doc(firestore, 'shiftInfos', shiftInfo.id)
      await updateDoc(docRef, {
        acknowledgedBy: arrayUnion(currentUser)
      })
    } catch (e) {
      console.error("Virhe kuittauksessa:", e)
    }
  }

  const addMaintenanceNote = async () => {
    if (!newMaintenanceText.trim() || !firestore) return
    setIsSaving(true)
    try {
      await addDoc(collection(firestore, 'maintenanceNotes'), {
        text: newMaintenanceText,
        createdAt: serverTimestamp(),
        createdBy: currentUser,
        status: 'active'
      })
      setNewMaintenanceText("")
    } catch (e) {
      console.error("Virhe huollon lisäyksessä:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteMaintenanceNote = async (id: string) => {
    if (!firestore || !id) return
    try {
      await deleteDoc(doc(firestore, 'maintenanceNotes', id))
    } catch (e) {
      console.error("Virhe poistossa:", e)
    }
  }

  const safeFormatDate = (date: any) => {
    if (!date || !isMounted) return "---"
    try {
      let d: Date;
      if (date && typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else if (date?.seconds) {
        d = new Date(date.seconds * 1000);
      } else {
        d = new Date(date);
      }
      if (!d || isNaN(d.getTime())) return "---"
      return formatDistanceToNow(d, { addSuffix: true, locale: fi })
    } catch (e) {
      return "---"
    }
  }

  const combinedLogs = useMemo(() => {
    const logs = [
      ...latestRecipes.map(r => ({
        id: r.id || `recipe-${Math.random()}`,
        text: `Uusi resepti: ${r.name || 'Nimetön'}`,
        time: r.createdAt,
        icon: ChefHat
      })),
      ...latestDishes.map(d => ({
        id: d.id || `dish-${Math.random()}`,
        text: `Uusi annos: ${d.name || 'Nimetön'}`,
        time: d.createdAt,
        icon: CookingPot
      }))
    ]
    return logs.sort((a, b) => {
      const getTime = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val?.seconds) return val.seconds * 1000;
        const d = new Date(val);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return getTime(b.time) - getTime(a.time)
    }).slice(0, 8)
  }, [latestRecipes, latestDishes])

  if (!isMounted) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Zap className="w-8 h-8 animate-spin text-accent opacity-20" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2 px-1">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Ohjauspaneeli</h1>
        </div>
        <div className="flex items-center gap-3 opacity-60">
          <Badge variant="outline" className="border-green-500/50 text-green-500 font-black tracking-widest bg-green-500/5 px-2 py-0.5 h-5 text-[10px]">SYSTEM OK</Badge>
          <span className="text-[10px] uppercase font-bold tracking-widest">ID: {user?.uid?.slice(0, 8) || 'wisemisa'}</span>
        </div>
      </header>

      <OmavalvontaStatusHeader record={latestRecord} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {shiftInfo && !isRead && (shiftInfo.bulletPoints?.length > 0 || shiftInfo.freeText) && (
            <Card className="industrial-card animate-breathing overflow-hidden border-accent/20">
              <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-accent" />
                  <CardTitle className="text-sm font-black text-accent uppercase tracking-widest">VUORO-INFO</CardTitle>
                </div>
                <Button onClick={markAsRead} size="sm" variant="ghost" className="h-8 px-4 text-xs font-black uppercase tracking-widest text-accent hover:bg-accent/10">
                  <CheckCircle className="w-4 h-4 mr-2" /> KUITTAA
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shiftInfo.bulletPoints?.map((p: string, i: number) => p && (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-sm font-bold">{p}</span>
                    </div>
                  ))}
                </div>
                {shiftInfo.freeText && (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-sm text-foreground/80 italic leading-relaxed whitespace-pre-wrap">{shiftInfo.freeText}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 steel-detail metal-shine-overlay" />
            <CardHeader className="p-6 pb-2">
              <CardTitle className="font-headline text-lg font-black text-accent flex items-center gap-3 uppercase tracking-widest">
                <Wrench className="w-6 h-6" /> HUOMIOT & HUOLLOT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex gap-4">
                <Input 
                  placeholder="Kirjaa huomio tai huoltotarve..." 
                  value={newMaintenanceText}
                  onChange={(e) => setNewMaintenanceText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMaintenanceNote()}
                  className="bg-white/5 border-white/10 h-12 text-sm rounded-xl"
                  disabled={isSaving}
                />
                <Button onClick={addMaintenanceNote} className="copper-gradient h-12 px-6" disabled={isSaving}>
                  {isSaving ? <Zap className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              
              <ScrollArea className="h-60 pr-4">
                <div className="space-y-3">
                  {maintenanceNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/20 transition-all group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-1.5 h-8 copper-gradient rounded-full shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-bold text-foreground truncate">{note.text}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                            {safeFormatDate(note.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMaintenanceNote(note.id)} className="h-10 w-10 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="industrial-card">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="font-headline text-[12px] font-black text-accent uppercase tracking-[0.2em]">LOKI</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {combinedLogs.map((log) => {
                  const Icon = log.icon;
                  return (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:bg-white/10 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-foreground leading-tight truncate">{log.text}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                          {safeFormatDate(log.time)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
