
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Search, UserPlus, Mail, ShieldCheck, Check, UserMinus, UserCog, Save, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  { id: 'admin', name: 'Keittiömestari', price: '24,90 €/kk' },
  { id: 'power', name: 'Vuoromestari', price: '6,90 €/kk' },
  { id: 'editor', name: 'Kokki', price: '4,90 €/kk' },
  { id: 'viewer', name: 'Apuhenkilöstö', price: '4,90 €/kk' },
]

export function DirectoryModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const isAdmin = true // Oletusarvoisesti admin hallitsee

  const contactsRef = useMemo(() => (firestore ? collection(firestore, 'contacts') : null), [firestore])
  const contactsQuery = useMemo(() => (contactsRef ? query(contactsRef, orderBy('name', 'asc')) : null), [contactsRef])
  const { data: contacts = [] } = useCollection<Contact>(contactsQuery)

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" })
  const [selectedRole, setSelectedRole] = useState("editor")
  const [isInviting, setIsInviting] = useState(false)
  const [showInvitationSuccess, setShowInvitationSuccess] = useState(false)

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

  const handleOpenTeamDialog = (contact: Contact) => {
    setSelectedContact(contact)
    const roleId = ROLES.find(r => r.name === contact.role)?.id || "editor"
    setSelectedRole(roleId)
    setIsTeamDialogOpen(true)
  }

  const sendInvitation = () => {
    if (!selectedContact || !firestore) return
    setIsInviting(true)
    
    const roleName = ROLES.find(r => r.id === selectedRole)?.name || "Kokki"
    const docRef = doc(firestore, 'contacts', selectedContact.id)
    
    // Simuloidaan kutsuviive ja QR-koodin luonti
    setTimeout(() => {
      setDoc(docRef, { 
        isTeamMember: true, 
        role: roleName 
      }, { merge: true }).then(() => {
        setIsInviting(false)
        setShowInvitationSuccess(true)
        toast({
          title: selectedContact.isTeamMember ? "Rooli päivitetty" : "Tiimiin lisätty",
          description: `${selectedContact.name} on nyt ${roleName}.`,
        })
      })
    }, 1500)
  }

  const removeFromTeam = () => {
    if (!selectedContact || !firestore) return
    const docRef = doc(firestore, 'contacts', selectedContact.id)
    setDoc(docRef, { isTeamMember: false, role: "" }, { merge: true }).then(() => {
      toast({ title: "Poistettu tiimistä" })
      setIsTeamDialogOpen(false)
    })
  }

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "" })
    setSelectedContact(null)
    setIsTeamDialogOpen(false)
    setShowInvitationSuccess(false)
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-black copper-text-glow uppercase tracking-tight">Yhteystiedot</h2>
          <p className="text-muted-foreground font-medium">Tiimin hallinta ja kumppaniverkosto.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsEventDialogOpen(true); }} className="copper-gradient hover:opacity-90 gap-2 shadow-lg font-black uppercase text-xs h-12 px-6">
          <UserPlus className="w-4 h-4" /> Uusi kontakti
        </Button>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent" />
        <Input 
          placeholder="Etsi nimellä tai roolilla..." 
          className="pl-12 bg-black/20 border-white/10 h-12 rounded-xl focus:border-accent/40" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredContacts.map((contact) => (
          <Card key={contact.id} className="industrial-card group hover:border-accent/30 transition-all">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-white/10 shadow-lg">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed || contact.id}/200/200`} />
                    <AvatarFallback className="bg-primary/20 text-accent font-black">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  {contact.isTeamMember && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background shadow-lg">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-black text-foreground">{contact.name}</h3>
                    {contact.isTeamMember && <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{contact.role}</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Phone className="w-3 h-3 text-accent/60" /> {contact.phone}</p>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Mail className="w-3 h-3 text-accent/60" /> {contact.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenTeamDialog(contact)}
                  className={cn(
                    "font-black uppercase text-[10px] h-10 px-4 transition-all",
                    contact.isTeamMember ? "border-green-500/20 text-green-500 hover:bg-green-500/10" : "border-accent/40 text-accent hover:bg-accent/10"
                  )}
                >
                  {contact.isTeamMember ? <UserCog className="w-3.5 h-3.5 mr-2" /> : <ShieldCheck className="w-3.5 h-3.5 mr-2" />}
                  {contact.isTeamMember ? "Hallitse" : "Tiimiin"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-muted-foreground hover:text-accent"
                  onClick={() => { setSelectedContact(contact); setFormData({ name: contact.name, phone: contact.phone, email: contact.email }); setIsEventDialogOpen(true); }}
                >
                  <UserCog className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="bg-background border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-xl uppercase tracking-tight">{selectedContact ? "Muokkaa yhteystietoa" : "Lisää uusi kontakti"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Koko nimi</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Sähköposti</Label>
              <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Puhelin</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveContact} className="copper-gradient text-white font-black w-full h-12 uppercase tracking-widest text-xs">Tallenna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="bg-background border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent text-lg uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" /> Tiimijäsenyys
            </DialogTitle>
          </DialogHeader>

          {!showInvitationSuccess ? (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Käyttöoikeustaso & Hinta</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {ROLES.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span className="font-bold">{role.name}</span>
                          <span className="text-[10px] text-accent font-black">{role.price}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">
                  Kun vahvistat, henkilö saa Magic Link -kirjautumislinkin sähköpostiinsa: <span className="text-accent">{selectedContact?.email}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={sendInvitation} disabled={isInviting} className="w-full copper-gradient text-white font-black h-14 gap-3 uppercase tracking-widest text-xs">
                  {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {selectedContact?.isTeamMember ? "PÄIVITÄ ROOLI" : "VAHVISTA JA KUTSU"}
                </Button>
                {selectedContact?.isTeamMember && (
                  <Button variant="ghost" onClick={removeFromTeam} className="w-full text-destructive font-black uppercase text-[10px] h-10">
                    <UserMinus className="w-4 h-4 mr-2" /> Poista tiimistä
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 py-8 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h4 className="font-headline font-black text-foreground">Kutsu lähetetty!</h4>
                <p className="text-xs text-muted-foreground">Käyttäjä voi nyt kirjautua sähköpostillaan.</p>
              </div>
              <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)} className="w-full font-black uppercase text-[10px]">Valmis</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
