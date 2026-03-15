"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Shield, Settings, Banknote, Users2, CreditCard, Info } from "lucide-react"
import { useFirestore, useDoc, useCollection, useUser } from "@/firebase"
import { doc, setDoc, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function AdminModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  const teamMembersRef = useMemo(() => (firestore && user ? collection(firestore, 'userProfiles', user.uid, 'teamMembers') : null), [firestore, user])
  
  const { data: settings } = useDoc<any>(settingsRef)
  const { data: teamMembers = [] } = useCollection<any>(teamMembersRef)

  const [targetMargin, setTargetMargin] = useState(75)
  const [hourlyRate, setHourlyRate] = useState(22)

  useEffect(() => {
    if (settings) {
      setTargetMargin(settings.targetMargin || 75)
      setHourlyRate(settings.hourlyRate || 22)
    }
  }, [settings])

  // Reaaliaikainen hinnoittelulaskenta
  const billing = useMemo(() => {
    const basePrice = 14.90
    const perMemberPrice = 4.50
    const memberCount = teamMembers.length
    const total = basePrice + (memberCount * perMemberPrice)
    return { basePrice, memberCount, perMemberPrice, total }
  }, [teamMembers])

  const saveSettings = () => {
    if (!settingsRef) return
    setDoc(settingsRef, { targetMargin, hourlyRate }, { merge: true })
      .then(() => toast({ title: "Asetukset tallennettu" }))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-2xl font-headline font-black text-primary uppercase tracking-tight">Hallinta & Talous</h2>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">System Administration</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="industrial-card border-accent/20 bg-accent/5">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Users2 className="w-6 h-6 text-accent" />
            <div className="text-2xl font-black text-foreground">{billing.memberCount}</div>
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">TIIMIN KOKO</p>
          </CardContent>
        </Card>
        <Card className="industrial-card border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Banknote className="w-6 h-6 text-accent" />
            <div className="text-2xl font-black text-foreground">{billing.total.toFixed(2)} €</div>
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">ARVIOITU KK-HINTA</p>
          </CardContent>
        </Card>
        <Card className="industrial-card">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Shield className="w-6 h-6 text-green-500 opacity-60" />
            <div className="text-[10px] font-black text-foreground uppercase tracking-widest">TILA: AKTIIVINEN</div>
            <p className="text-[9px] font-black uppercase text-green-500 tracking-widest">PRO-LISENSSI</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="industrial-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-[11px] font-black uppercase text-accent flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> LASKUTUKSEN ERITTELY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-xs font-bold border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Perusmaksu</span>
              <span>{billing.basePrice.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Jäsenet ({billing.memberCount} kpl)</span>
              <span>{(billing.memberCount * billing.perMemberPrice).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-black uppercase">Yhteensä (ALV 0%)</span>
              <span className="text-xl font-black text-accent">{billing.total.toFixed(2)} € / KK</span>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-[9px] text-blue-400/80 leading-relaxed uppercase font-bold">
                Hinta päivittyy automaattisesti, kun uusi laite skannaa kutsukoodin ja liittyy tiimiisi.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="industrial-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-[11px] font-black uppercase text-accent flex items-center gap-2">
              <Settings className="w-4 h-4" /> KEITTIÖN PARAMETRIT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-muted-foreground">Tavoitekatetuotto (%)</Label>
              <Input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-black/40 h-10 font-black text-accent" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-muted-foreground">Tuntipalkka keskiarvo (€/h)</Label>
              <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="bg-black/40 h-10 font-black text-accent" />
            </div>
            <Button onClick={saveSettings} className="w-full copper-gradient text-white font-black h-10 uppercase tracking-widest text-[10px] mt-2">
              TALLENNA MUUTOKSET
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
