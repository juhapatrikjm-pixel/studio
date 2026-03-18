
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Search, UserPlus, Mail, ShieldCheck, QrCode, Copy, Check, Loader2, MessageSquare, Trash2, Edit2, Save, X, Plus } from "lucide-react"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Contact = {
  id: string
  name: string
  phone: string
  email: string
  createdAt: any
}

export function DirectoryModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)
  const isAdmin = profile?.role === 'admin'

  const contactsRef = useMemo(() => (firestore ? collection(firestore, 'contacts') : null), [firestore])
  const { data: contacts = [] } = useCollection<Contact>(contactsRef ? query(contactsRef, orderBy('name', 'asc')) : null)

  const [searchTerm, setSearchTerm] = useState("")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    phone: "",
    email: ""
  })

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

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !firestore) return
    setIsSaving(true)
    const id = formData.id || Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'contacts', id)
    
    setDoc(docRef, {
      ...formData,
      id,
      createdAt: serverTimestamp()
    }, { merge: true }).then(() => {
      toast({ title: formData.id ? "Päivitetty" : "Lisätty" })
      setIsAddContactOpen(false)
      setFormData({ id: "", name: "", phone: "", email: "" })
    }).finally(() => setIsSaving(false))
  }

  const handleDeleteContact = async (id: string) => {
    if (!firestore || !confirm("Poistetaanko yhteystieto?")) return
    await deleteDoc(doc(firestore, 'contacts', id))
    toast({ title: "Poistettu" })
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-black text-primary uppercase tracking-tight">Yhteystiedot</h2>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Company Directory</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button onClick={() => setIsAddContactOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-accent font-black uppercase text-[10px] h-10 px-6 gap-2">
                <Plus className="w-4 h-4" /> LISÄÄ YHTEYSTIETO
              </Button>
              <Button onClick={() => setIsInviteOpen(true)} className="copper-gradient hover:opacity-90 gap-2 shadow-lg font-black uppercase text-[10px] h-10 px-6">
                <QrCode className="w-4 h-4" /> KUTSU TIIMIIN
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Etsi nimellä tai puhelinnumerolla..." 
          className="pl-12 bg-black/20 border-white/10 h-12 rounded-2xl focus:border-accent/40" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Kaikki yhteystiedot ({filteredContacts.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="industrial-card group hover:border-accent/30 transition-all border-none bg-white/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border border-white/10">
                    <AvatarFallback className="bg-primary/20 text-accent font-black text-lg">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{contact.name}</h3>
                    {isAdmin && (
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-muted-foreground font-bold">{contact.phone}</p>
                        <p className="text-[10px] text-muted-foreground/60">{contact.email}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 mr-2">
                    <a href={`tel:${contact.phone}`} className="p-2.5 rounded-xl bg-black/40 text-accent hover:bg-accent/20 transition-colors">
                      <Phone className="w-4 h-4" />
                    </a>
                    <a href={`sms:${contact.phone}`} className="p-2.5 rounded-xl bg-black/40 text-accent hover:bg-accent/20 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </a>
                    <a href={`mailto:${contact.email}`} className="p-2.5 rounded-xl bg-black/40 text-accent hover:bg-accent/20 transition-colors">
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-1 border-l border-white/5 pl-2">
                      <Button variant="ghost" size="icon" onClick={() => { setFormData(contact); setIsAddContactOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-accent">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredContacts.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
            <p className="text-[10px] font-black uppercase tracking-widest">Ei yhteystietoja. Lisää uusi hallintapaneelista.</p>
          </div>
        )}
      </div>

      {/* MUOKKAUS / LISÄYS DIALOG */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="bg-background border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              {formData.id ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />} 
              {formData.id ? "Muokkaa yhteystietoa" : "Lisää yhteystieto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Koko nimi</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/40 border-white/10 h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Puhelinnumero</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-black/40 border-white/10 h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sähköposti</Label>
              <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-black/40 border-white/10 h-11" />
            </div>
            <Button onClick={handleSaveContact} disabled={isSaving} className="w-full copper-gradient text-white font-black h-12 uppercase text-xs mt-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} TALLENNA TIEDOT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KUTSU QR DIALOG */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="bg-background border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              <QrCode className="w-5 h-5" /> Kutsu tiimiin
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-2xl">
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
