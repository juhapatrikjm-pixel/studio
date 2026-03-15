
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, MessageCircle, MoreHorizontal, Search, UserPlus, Mail, Trash2, ShieldCheck, QrCode, X, Check, Users, UserMinus, UserCog, Save } from "lucide-react"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Contact = {
  id: string
  name: string
  phone: string
  email: string
  role?: string
  isTeamMember?: boolean
  avatarSeed?: string
}

const ROLES = [
  { id: 'admin', name: 'Keittiömestari' },
  { id: 'power', name: 'Vuoromestari' },
  { id: 'editor', name: 'Kokki' },
  { id: 'viewer', name: 'Apuhenkilöstö' },
]

export function DirectoryModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  // Oletetaan että koekäytössä kaikki voivat muokata, tai vain tietyt sähköpostit
  const isAdmin = true 

  const contactsRef = useMemo(() => (firestore ? collection(firestore, 'contacts') : null), [firestore])
  const contactsQuery = useMemo(() => (contactsRef ? query(contactsRef, orderBy('name', 'asc')) : null), [contactsRef])
  const { data: contacts = [] } = useCollection<Contact>(contactsQuery)

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  })
  
  const [selectedRole, setSelectedRole] = useState("editor")
  const [showQr, setShowQr] = useState(false)

  const handleSaveContact = () => {
    if (!formData.name.trim() || !firestore) return
    
    const id = selectedContact?.id || Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'contacts', id)
    const contactData = {
      id,
      ...formData,
      avatarSeed: formData.name.toLowerCase().replace(/\s/g, '-'),
    }

    setDoc(docRef, contactData, { merge: true })
      .then(() => {
        toast({ title: selectedContact ? "Muutokset tallennettu" : "Yhteystieto lisätty" })
        setIsEventDialogOpen(false)
        resetForm()
      })
  }

  const handleDeleteContact = (id: string) => {
    if (!firestore || !isAdmin) return
    const docRef = doc(firestore, 'contacts', id)
    deleteDoc(docRef)
  }

  const handleOpenTeamDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setSelectedRole(ROLES.find(r => r.name === contact.role)?.id || "editor")
    setIsTeamDialogOpen(true)
  }

  const sendInvitation = () => {
    setShowQr(true)
    setTimeout(() => {
      if (selectedContact && firestore) {
        const docRef = doc(firestore, 'contacts', selectedContact.id)
        setDoc(docRef, { 
          isTeamMember: true, 
          role: ROLES.find(r => r.id === selectedRole)?.name || "Kokki" 
        }, { merge: true })
      }
      toast({
        title: contactIsAlreadyMember ? "Rooli päivitetty" : "Kutsu valmis!",
        description: contactIsAlreadyMember ? "Käyttöoikeustaso on nyt päivitetty." : `Käyttäjä ${selectedContact?.name} voi nyt kirjautua sovellukseen sähköpostillaan.`,
      })
      if (contactIsAlreadyMember) setIsTeamDialogOpen(false)
    }, 1500)
  }

  const removeFromTeam = () => {
    if (!selectedContact || !firestore) return
    const docRef = doc(firestore, 'contacts', selectedContact.id)
    setDoc(docRef, { 
      isTeamMember: false, 
      role: "" 
    }, { merge: true }).then(() => {
      toast({
        title: "Poistettu tiimistä",
        description: `${selectedContact.name} on nyt vain yhteystieto.`,
      })
      setIsTeamDialogOpen(false)
    })
  }

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "" })
    setSelectedContact(null)
    setShowQr(false)
    setIsTeamDialogOpen(false)
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const contactIsAlreadyMember = selectedContact?.isTeamMember

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-black copper-text-glow">Yhteystiedot</h2>
          <p className="text-muted-foreground font-medium">Tiimin jäsenet ja tärkeät kumppanit.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setIsEventDialogOpen(true); }} className="copper-gradient hover:opacity-90 gap-2 shadow-lg metal-shine-overlay font-black uppercase text-xs">
            <UserPlus className="w-4 h-4" /> Lisää uusi kontakti
          </Button>
        )}
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
        <Input 
          placeholder="Etsi nimellä tai roolilla..." 
          className="pl-12 bg-white/5 border-white/10 h-12 rounded-xl focus:border-accent/40" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredContacts.map((contact) => (
          <Card key={contact.id} className="industrial-card group hover:border-accent/30 transition-all border-white/5 overflow-hidden">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed || contact.id}/200/200`} />
                    <AvatarFallback className="bg-primary/20 text-accent font-black">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  {contact.isTeamMember && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background shadow-lg" title="Tiimin jäsen">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-black text-foreground">{contact.name}</h3>
                    {contact.isTeamMember && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{contact.role}</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-accent/60" /> {contact.phone}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-accent/60" /> {contact.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a href={`tel:${contact.phone}`}>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full transition-all">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/5">
                    {contact.isTeamMember ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenTeamDialog(contact)}
                        className="border-green-500/20 text-green-500 hover:bg-green-500/10 font-black uppercase text-[9px] h-10 px-3"
                      >
                        <UserCog className="w-3 h-3 mr-1.5" /> Hallitse
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenTeamDialog(contact)}
                        className="border-accent/40 text-accent hover:bg-accent/10 font-black uppercase text-[9px] h-10 px-3"
                      >
                        <ShieldCheck className="w-3 h-3 mr-1.5" /> Tiimiin
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-muted-foreground hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSelectedContact(contact)
                        setFormData({ name: contact.name, phone: contact.phone, email: contact.email })
                        setIsEventDialogOpen(true)
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEventDialogOpen(open); }}>
        <DialogContent className="bg-background border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-tight flex items-center gap-3">
              <UserPlus className="w-6 h-6" /> {selectedContact ? "Muokkaa kontakti" : "Uusi kontakti"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Koko nimi</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Matti Meikäläinen"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Sähköposti (Kirjautumista varten)</Label>
              <Input 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                placeholder="matti@wisemisa.fi"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Puhelinnumero</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                placeholder="+358..."
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedContact && (
              <Button variant="ghost" size="icon" onClick={() => { handleDeleteContact(selectedContact.id); setIsEventDialogOpen(false); }} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={handleSaveContact} className="copper-gradient text-white font-black w-full sm:w-auto">Tallenna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="bg-background border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" /> {contactIsAlreadyMember ? "Muokkaa tiimijäsenyyttä" : "Kutsu tiimiin"}
            </DialogTitle>
          </DialogHeader>

          {!showQr ? (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Käyttöoikeustaso</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Valitse rooli" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {ROLES.map(role => (
                      <SelectItem key={role.id} value={role.id} className="text-sm font-bold">{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <p className="text-[10px] text-muted-foreground uppercase font-medium leading-relaxed">
                  Kun lisäät henkilön tiimiin, hän voi kirjautua sovellukseen sähköpostilla: <span className="text-accent">{selectedContact?.email}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={sendInvitation} className="w-full copper-gradient text-white font-black h-14 gap-3 shadow-2xl metal-shine-overlay uppercase tracking-widest text-xs">
                  {contactIsAlreadyMember ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  {contactIsAlreadyMember ? "PÄIVITÄ ROOLI" : "VAHVISTA TIIMIIN"}
                </Button>
                
                {contactIsAlreadyMember && (
                  <Button variant="ghost" onClick={removeFromTeam} className="w-full text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] h-10 gap-2">
                    <UserMinus className="w-4 h-4" /> Poista tiimistä
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h4 className="font-headline font-black text-foreground">Tiimiin lisätty!</h4>
                <p className="text-xs text-muted-foreground">Käyttäjä voi nyt kirjautua sisään omilla Google-tunnuksillaan.</p>
              </div>
              <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)} className="border-white/10 w-full font-black uppercase text-[10px]">Valmis</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
