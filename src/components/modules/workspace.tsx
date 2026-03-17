
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, ChefHat, CookingPot, Wrench, Send, Trash2, CheckCircle, Zap, Loader2 } from "lucide-react"
import { MonitoringPulse } from "../monitoring-pulse"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, where } from "firebase/firestore"
import { format, formatDistanceToNow, isValid } from "date-fns"
import { fi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as workspaceService from "@/services/workspace-service"

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

  // Data queries targeting "wisemisa" database
  const shiftInfoQuery = useMemo(() => {
    if (!firestore || !todayDate) return null
    return query(
      collection(firestore, 'shiftInfos'), 
      where('date', '==', todayDate),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  }, [firestore, todayDate])
  
  const recipesQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'recipes'), orderBy('createdAt', 'desc'), limit(5)) : null, 
  [firestore])

  const dishesQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'dishes'), orderBy('createdAt', 'desc'), limit(5)) : null, 
  [firestore])

  const maintenanceQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'maintenanceNotes'), orderBy('createdAt', 'desc'), limit(15)) : null, 
  [firestore])

  const { data: shiftInfos = [] } = useCollection<any>(shiftInfoQuery)
  const { data: latestRecipes = [] } = useCollection<any>(recipesQuery)
  const { data: latestDishes = [] } = useCollection<any>(dishesQuery)
  const { data: maintenanceNotes = [] } = useCollection<any>(maintenanceQuery)

  const shiftInfo = shiftInfos[0] || null

  const isRead = useMemo(() => {
    if (!shiftInfo) return false
    return (shiftInfo.acknowledgedBy || []).includes(currentUser) || (shiftInfo.id && readInfoIds.includes(shiftInfo.id))
  }, [shiftInfo, currentUser, readInfoIds])

  const markAsRead = async () => {
    if (!firestore || !shiftInfo || !shiftInfo.id) return
    try {
      setReadInfoIds(prev => [...prev, shiftInfo.id])
      await workspaceService.acknowledgeShiftInfo(firestore, shiftInfo.id, currentUser)
    } catch (e) {
      console.error("Error acknowledging info:", e)
    }
  }

  const addMaintenanceNote = async () => {
    if (!newMaintenanceText.trim() || !firestore) return
    setIsSaving(true)
    try {
      await workspaceService.addMaintenanceNote(firestore, newMaintenanceText, currentUser)
      setNewMaintenanceText("")
    } catch (e) {
      console.error("Error adding maintenance note:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteMaintenanceNote = async (id: string) => {
    if (!firestore || !id) return
    try {
      await workspaceService.deleteMaintenanceNote(firestore, id)
    } catch (e) {
      console.error("Error deleting note:", e)
    }
  }

  const safeFormatDate = (date: any) => {
    if (!date || !isMounted) return "---"
    try {
      let d: Date;
      if (date && typeof date.toDate === 'function') d = date.toDate();
      else if (date instanceof Date) d = date;
      else if (date?.seconds) d = new Date(date.seconds * 1000);
      else d = new Date(date);
      
      if (!d || !isValid(d)) return "---"
      return formatDistanceToNow(d, { addSuffix: true, locale: fi })
    } catch (e) {
      return "---"
    }
  }

  const combinedLogs = useMemo(() => {
    if (!isMounted) return [];
    try {
      const logs = [
        ...(latestRecipes || []).map(r => ({ id: r.id, text: `Uusi resepti: ${r.name}`, time: r.createdAt, icon: ChefHat, type: 'recipe' })),
        ...(latestDishes || []).map(d => ({ id: d.id, text: `Uusi annos: ${d.name}`, time: d.createdAt, icon: CookingPot, type: 'dish' }))
      ]
      return logs.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val?.seconds) return val.seconds * 1000;
          if (val instanceof Date) return val.getTime();
          const d = new Date(val);
          return isValid(d) ? d.getTime() : 0;
        }
        return getTime(b.time) - getTime(a.time)
      }).slice(0, 10)
    } catch (error) {
      console.error("Error calculating logs:", error);
      return [];
    }
  }, [latestRecipes, latestDishes, isMounted])

  if (!isMounted) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Ladataan työtilaa...</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      {/* HEADER */}
      <header className="flex flex-col gap-2 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Ohjauspaneeli</h1>
        </div>
        <div className="flex items-center gap-3 opacity-60">
          <Badge variant="outline" className="border-green-500/50 text-green-500 font-black tracking-widest bg-green-500/5 px-2 py-0.5 h-5 text-[9px]">SYSTEM ONLINE</Badge>
          <span className="text-[10px] uppercase font-bold tracking-widest">DATABASE: wisemisa</span>
        </div>
      </header>

      {/* STATUS BAR - PALAUTETTU TÄHÄN */}
      <MonitoringPulse />

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">
          {/* DAILY INFO ALERT */}
          {shiftInfo && !isRead && (shiftInfo.bulletPoints?.length > 0 || shiftInfo.freeText) && (
            <Card className="industrial-card animate-breathing overflow-hidden border-accent/20">
              <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-2 space-y-0">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-accent" />
                  <CardTitle className="text-sm font-black text-accent uppercase tracking-widest">VUORO-INFO</CardTitle>
                </div>
                <Button onClick={markAsRead} size="sm" variant="ghost" className="h-8 px-4 text-xs font-black uppercase tracking-widest text-accent hover:bg-accent/10 border border-accent/20">
                  <CheckCircle className="w-4 h-4 mr-2" /> KUITTAA
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shiftInfo.bulletPoints?.map((p: string, i: number) => p && (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(184,115,51,0.5)]" />
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

          {/* MAINTENANCE NOTES */}
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
                  className="bg-white/5 border-white/10 h-12 text-sm rounded-xl focus:border-accent/40"
                  disabled={isSaving}
                />
                <Button onClick={addMaintenanceNote} className="copper-gradient h-12 px-6 shadow-lg" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              
              <ScrollArea className="h-72 pr-4">
                <div className="space-y-3">
                  {maintenanceNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/20 transition-all group shadow-inner">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-1 h-8 copper-gradient rounded-full shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-bold text-foreground truncate">{note.text}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                            {safeFormatDate(note.createdAt)} • {note.createdBy || 'Tiimi'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteMaintenanceNote(note.id)} 
                        className="h-10 w-10 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  {maintenanceNotes.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                      <p className="text-[10px] font-black uppercase tracking-widest">Ei aktiivisia huoltoilmoituksia</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - LOG */}
        <div className="lg:col-span-4">
          <Card className="industrial-card h-full flex flex-col">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="font-headline text-[12px] font-black text-accent uppercase tracking-[0.2em]">KEITTIÖN LOKI</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex-1">
              <div className="space-y-3">
                {combinedLogs.map((log) => {
                  const Icon = log.icon;
                  return (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/5 hover:bg-white/10 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-foreground leading-tight truncate uppercase tracking-tight">{log.text}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                          {safeFormatDate(log.time)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {combinedLogs.length === 0 && (
                  <div className="py-20 text-center opacity-20 italic text-xs uppercase tracking-widest">
                    Ei viimeaikaisia tapahtumia
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
