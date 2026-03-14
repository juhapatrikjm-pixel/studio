
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, MessageSquare, Cloud, Users, ShieldCheck, CheckCircle, Info } from "lucide-react"
import { OmavalvontaStatusHeader } from "./omavalvonta"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"

export function WorkspaceModule() {
  const firestore = useFirestore()
  const dateId = format(new Date(), 'yyyy-MM-dd')
  const recordsRef = firestore ? collection(firestore, 'selfMonitoringRecords') : null
  const recordsQuery = recordsRef ? query(recordsRef, orderBy('date', 'desc'), limit(1)) : null
  const { data: records = [] } = useCollection<any>(recordsQuery)
  const latestRecord = records[0] || null

  const infoRef = firestore ? doc(firestore, 'shiftInfos', dateId) : null
  const { data: shiftInfo } = useDoc<any>(infoRef)

  const [isReadLocal, setIsReadLocal] = useState(false)
  const currentUser = "John Smith" // Mockattu käyttäjä

  const activities = [
    { id: 1, text: "Uudet arkkitehtuurikuvat ladattu: 'Keittiölaajennus'", time: "2 min sitten", type: "cloud" },
    { id: 2, text: "Sarah Miller tägäsi sinut kanavalla #insinööri-ops", time: "15 min sitten", type: "message" },
    { id: 3, text: "Päivittäinen huoltopalaveri alkaa", time: "Nyt", type: "call" },
  ]

  const isRead = shiftInfo?.acknowledgedBy?.includes(currentUser) || isReadLocal

  const markAsRead = () => {
    if (!firestore || !infoRef) return
    setIsReadLocal(true)
    updateDoc(infoRef, {
      acknowledgedBy: arrayUnion(currentUser)
    })
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
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
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {shiftInfo.freeText && (
              <p className="text-sm text-foreground/80 italic border-l-2 border-accent/20 pl-4 py-1">
                {shiftInfo.freeText}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tiimin kapasiteetti</CardTitle>
            <Users className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">42</div>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter mt-1">+3 Uutta työntekijää</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aktiiviset kanavat</CardTitle>
            <MessageSquare className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">12</div>
            <p className="text-[10px] text-accent font-bold uppercase tracking-tighter mt-1">4 Lukematonta viestiä</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dataholvi</CardTitle>
            <Cloud className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold text-foreground">84%</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">1.2 TB / 1.5 TB Käytössä</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-lg text-accent">Toimintalokit</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Reaaliaikainen tiimin synkronointi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-transparent hover:border-primary/20 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                    {item.type === 'cloud' ? <Cloud className="w-4 h-4 text-accent" /> : <MessageSquare className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xl animate-breathing border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline text-lg text-accent">Suojauskäytännön tila</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase">Ylläpidon yleiskatsaus</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">RSA 4096 salaus</span>
              <Badge variant="outline" className="border-green-500 text-green-500 font-bold bg-green-500/10">AKTIIVINEN</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">Pääsyvaltuutus</span>
              <Badge className="copper-gradient text-white border-none font-bold">TASO 5</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-border">
              <span className="text-xs font-bold uppercase tracking-widest">Ydinjärjestelmän tila</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-xs font-bold text-green-500 uppercase">Normaali</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
