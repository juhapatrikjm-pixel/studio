"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Search, UserPlus, Mail, ShieldCheck, QrCode, Copy, Check, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type TeamMember = {
  id: string
  userId: string
  role: string
  joinedAt: any
}

export function DirectoryModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const teamRef = useMemo(() => (firestore && user ? collection(firestore, 'userProfiles', user.uid, 'teamMembers') : null), [firestore, user])
  const { data: teamMembers = [] } = useCollection<TeamMember>(teamRef)

  const [searchTerm, setSearchTerm] = useState("")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined' || !user) return ""
    return `${window.location.origin}/join?adminId=${user.uid}&role=worker`
  }, [user])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    toast({ title: "Linkki kopioitu!", description: "Lähetä tämä tiimiläiselle." })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-black text-primary uppercase tracking-tight">Tiimi & Laitteet</h2>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Connected Workforce</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="copper-gradient hover:opacity-90 gap-2 shadow-lg font-black uppercase text-[10px] h-10 px-6">
          <QrCode className="w-4 h-4" /> KUTSU TIIMIIN
        </Button>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Etsi jäsentä..." 
          className="pl-12 bg-black/20 border-white/10 h-11 rounded-xl focus:border-accent/40" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Aktiiviset jäsenet ({teamMembers.length})</h3>
        {teamMembers.map((member) => (
          <Card key={member.id} className="industrial-card group hover:border-accent/30 transition-all border-none bg-white/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-10 h-10 border border-white/10">
                  <AvatarImage src={`https://picsum.photos/seed/${member.userId}/200/200`} />
                  <AvatarFallback className="bg-primary/20 text-accent font-black">U</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-foreground uppercase">KÄYTTÄJÄ-{member.userId.slice(0, 4)}</h3>
                    <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{member.role}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Liittynyt: {member.joinedAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-green-500 opacity-40" />
            </CardContent>
          </Card>
        ))}
        {teamMembers.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
            <p className="text-[10px] font-black uppercase tracking-widest">Ei vielä tiimiläisiä. Kutsu jäseniä QR-koodilla.</p>
          </div>
        )}
      </div>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="bg-background border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              <QrCode className="w-5 h-5" /> Kutsu tiimiin
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-2xl">
              {/* Prototyypissä käytetään placeholderia QR-koodille */}
              <div className="w-full h-full bg-black flex items-center justify-center rounded-lg">
                <QrCode className="w-24 h-24 text-white" />
              </div>
            </div>
            <div className="space-y-2 w-full px-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                Skannaa koodi toisella laitteella tai jaa alla oleva linkki tiimiläiselle.
              </p>
              <div className="flex gap-2 mt-4">
                <Input value={joinUrl} readOnly className="bg-black/40 border-white/10 text-[9px] h-9 font-mono" />
                <Button variant="outline" size="icon" onClick={copyToClipboard} className="h-9 w-9 shrink-0 border-white/10">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
