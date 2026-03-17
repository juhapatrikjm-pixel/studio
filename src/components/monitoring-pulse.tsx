"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, AlertTriangle, User, Zap, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, Timestamp } from "firebase/firestore"
import { format, differenceInDays } from "date-fns"
import { fi } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import * as monitoringService from "@/services/monitoring-service"

/**
 * MonitoringPulse - Reaaliaikainen hälytyskomponentti omavalvonnan tilaan.
 * Sijoitetaan Info- ja Omavalvontasivuille.
 */
export function MonitoringPulse() {
  const firestore = useFirestore()
  const { user } = useUser()
  const [isMounted, setIsMounted] = useState(false)

  // Reaaliaikainen haku viimeisimmästä kirjauksesta
  const recordsQuery = useMemo(() => {
    if (!firestore) return null
    return query(collection(firestore, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(1))
  }, [firestore])
  
  const { data: records = [] } = useCollection<any>(recordsQuery)
  const latestRecord = records[0] || null

  useEffect(() => setIsMounted(true), [])

  if (!isMounted || !firestore) return null

  const getRecordDate = () => {
    if (!latestRecord?.date) return null
    if (latestRecord.date instanceof Timestamp) return latestRecord.date.toDate()
    if (latestRecord.date?.seconds) return new Date(latestRecord.date.seconds * 1000)
    return new Date(latestRecord.date)
  }

  const recordDate = getRecordDate()
  const daysSince = recordDate 
    ? Math.abs(differenceInDays(new Date(), recordDate)) 
    : 999
  
  const isCritical = daysSince >= 7
  const isOk = latestRecord?.status && daysSince === 0

  const handleManualAck = async () => {
    if (!user) return
    await monitoringService.acknowledgeMonitoring(
      firestore, 
      user.uid, 
      user.displayName || "Ylläpitäjä"
    )
  }

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
              {recordDate 
                ? `Viimeisin kirjaus: ${format(recordDate, 'd.M.yyyy')} (${daysSince} pv sitten) • ${latestRecord?.recordedBy || 'Tiimi'}` 
                : "EI AIEMPIA KIRJAUKSIA JÄRJESTELMÄSSÄ"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCritical && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualAck}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 font-black text-[10px] uppercase h-9 px-4 gap-2"
            >
              <Zap className="w-3 h-3" /> KUITTAA HÄLYTYS
            </Button>
          )}
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            isOk ? "bg-green-500 text-white border-green-400" : "bg-black/40 text-muted-foreground border-white/5"
          )}>
            {isOk ? "TÄNÄÄN TEHTY" : "ODOTTAA"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
