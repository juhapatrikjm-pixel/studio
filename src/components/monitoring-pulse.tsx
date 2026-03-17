"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, AlertTriangle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, Timestamp } from "firebase/firestore"
import { format, differenceInDays, isValid } from "date-fns"
import { fi } from "date-fns/locale"

export function MonitoringPulse() {
  const firestore = useFirestore()
  const [isMounted, setIsMounted] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  const recordsQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(1))
  }, [firestore])
  
  const { data: records = [] } = useCollection<any>(recordsQuery)
  const latestRecord = records[0] || null

  useEffect(() => {
    setIsMounted(true)
    setNow(new Date())
  }, [])

  const recordDate = useMemo(() => {
    if (!latestRecord?.date) return null
    try {
      if (latestRecord.date instanceof Timestamp) return latestRecord.date.toDate()
      if (latestRecord.date?.seconds) return new Date(latestRecord.date.seconds * 1000)
      const d = new Date(latestRecord.date)
      return isValid(d) ? d : null
    } catch (e) {
      return null
    }
  }, [latestRecord])

  const daysSince = useMemo(() => {
    if (!recordDate || !now) return 999
    try {
      return Math.abs(differenceInDays(now, recordDate))
    } catch (e) {
      return 999
    }
  }, [recordDate, now])

  if (!isMounted || !firestore) return null

  const isCritical = daysSince >= 7
  const isOk = daysSince === 0 && recordDate !== null

  return (
    <Card className={cn(
      "w-full border-2 transition-all duration-500 overflow-hidden industrial-card",
      isCritical ? "border-destructive/50 bg-destructive/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-green-500/20 bg-green-500/5",
      isOk && "border-green-500/40 bg-green-500/10"
    )}>
      <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative",
            isCritical ? "bg-destructive text-white animate-heartbeat" : "bg-green-500 text-white"
          )}>
            {isCritical ? <AlertTriangle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
            {isCritical && (
              <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-20" />
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-headline font-black text-lg uppercase tracking-tight",
                isCritical ? "text-destructive" : "text-green-500"
              )}>
                {isCritical ? "HÄLYTYS: OMAVALVONTA RÄSTISSÄ" : "OMAVALVONTA AJANTASALLA"}
              </h3>
              <Activity className={cn("w-4 h-4 opacity-40", isCritical && "animate-pulse")} />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-bold">
              {recordDate && isValid(recordDate)
                ? `Viimeisin kirjaus: ${format(recordDate, 'd.M.yyyy')} (${daysSince} pv sitten) • ${latestRecord?.recordedBy || 'Tiimi'}` 
                : "EI AIEMPIA KIRJAUKSIA JÄRJESTELMÄSSÄ"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            isOk ? "bg-green-500 text-white border-green-400" : "bg-black/40 text-muted-foreground border-white/5"
          )}>
            {isOk ? "TÄNÄÄN TEHTY" : "KIRJAUS ODOTTAA"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
