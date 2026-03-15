"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, MessageCircle, MoreHorizontal, Search, UserPlus, Mail, Trash2, ShieldCheck, QrCode, X, Check, Users } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
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
  const { toast } = useToast()
  
  // Simuloidaan järjestelmänvalvojan oikeudet
  const isAdmin = true // Oikeassa sovelluksessa tämä tulisi useUser() koukulta

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
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: contactData
        }))
      })
  }

  const handleDeleteContact = (id: string) => {
    if (!firestore || !isAdmin) return
    const docRef = doc(firestore, 'contacts', id)
    deleteDoc(docRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }))
    })
  }

  const handleAddToTeam = () => {
    if (!selectedContact || !firestore) return
    setIsTeamDialogOpen(true)
  }

  const sendInvitation = () => {
    // Simuloidaan kutsun ja QR-koodin lähetys
    setShowQr(true)
    setTimeout(() => {
      if (selectedContact) {
        const docRef = doc(firestore, 'contacts', selectedContact.id)
        setDoc(docRef, { 
          isTeamMember: true, 
          role: ROLES.find(r => r.id === selectedRole)?.name || "Kokki" 
        }, { merge: true })
      }
      toast({
        title: "Kutsu lähetetty!",
        description: `Kertakäyttöinen QR-koodi lähetetty sähköpostiin: ${selectedContact?.email}`,
      })
    }, 1500)
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-black copper-text-glow">Yhteystiedot</h2>
          <p className="text-muted-foreground font-medium">Tiimin jäsenet ja tärkeät kumppanit.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setIsEventDialogOpen(true); }} className="copper-gradient hover:opacity-90 gap-2 shadow-lg metal-shine-overlay font-black uppercase text-xs">
            <UserPlus className="w-4 h-4" /> Lisää yhteystieto
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
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
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
                  <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full transition-all hover:scale-110">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
                <a href={`sms:${contact.phone}`}>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full transition-all hover:scale-110">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </a>
                {isAdmin && (
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
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredContacts.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
            <Users className="w-12 h-12 text-muted-foreground" />
            <p className="text-xs uppercase font-black tracking-widest italic">Yhteystietoja ei löytynyt</p>
          </div>
        )}
      </div>

      {/* Yhteystiedon muokkaus/lisäys Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEventDialogOpen(open); }}>
        <DialogContent className="bg-background border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-tight flex items-center gap-3">
              <UserPlus className="w-6 h-6" /> {selectedContact ? "Muokkaa yhteystietoa" : "Uusi yhteystieto"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Tallenna yhteistyökumppanin tai työntekijän tiedot.</DialogDescription>
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
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Puhelinnumero</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                placeholder="+358..."
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Sähköposti</Label>
              <Input 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                placeholder="matti@wisemisa.fi"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>

            {selectedContact && (
              <div className="pt-4 border-t border-white/5">
                <Button 
                  variant="outline" 
                  onClick={handleAddToTeam}
                  className="w-full border-accent/20 text-accent hover:bg-accent/10 font-black uppercase text-[10px] h-11 gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Lisää tiimiin
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedContact && (
              <Button variant="ghost" size="icon" onClick={() => { handleDeleteContact(selectedContact.id); setIsEventDialogOpen(false); }} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} className="border-white/10 flex-1 sm:flex-none">Peruuta</Button>
              <Button onClick={handleSaveContact} className="copper-gradient text-white font-black flex-1 sm:flex-none">Tallenna</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lisää tiimiin Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="bg-background border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" /> Kutsu tiimiin
            </DialogTitle>
            <DialogDescription className="text-muted-foreground italic text-xs">
              Valitse käyttöoikeustaso henkilölle {selectedContact?.name}.
            </DialogDescription>
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
                  Henkilölle lähetetään digitaalinen kertakäyttöinen QR-koodi, joka oikeuttaa valittuun tasoon Wisemisa Bistro -työtilassa.
                </p>
              </div>

              <Button onClick={sendInvitation} className="w-full copper-gradient text-white font-black h-14 gap-3 shadow-2xl metal-shine-overlay uppercase tracking-widest text-xs">
                <QrCode className="w-5 h-5" /> LÄHETÄ KUTSU
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 py-8 animate-in zoom-in-95 duration-500">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full group-hover:bg-accent/40 transition-all" />
                <div className="relative w-48 h-48 bg-white p-4 rounded-3xl shadow-2xl metal-shine-overlay">
                  {/* Tässä olisi oikea QR-koodi kirjastolla, käytetään ikonia ja kuviota simulaationa */}
                  <div className="w-full h-full border-4 border-black/5 flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-24 h-24 text-black" />
                    <div className="w-full grid grid-cols-4 gap-1 px-4">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className={cn("h-1 bg-black/20 rounded-full", i % 3 === 0 && "bg-black/60")} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-500 font-black uppercase text-xs tracking-widest">
                  <Check className="w-4 h-4" /> Kutsu Lähetetty
                </div>
                <p className="text-[10px] text-muted-foreground font-medium max-w-[200px] mx-auto italic">
                  Tämä koodi on nyt lähetetty osoitteeseen {selectedContact?.email}.
                </p>
              </div>

              <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)} className="border-white/10 w-full font-black uppercase text-[10px]">Valmis</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
