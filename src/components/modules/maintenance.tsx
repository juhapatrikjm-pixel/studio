
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wrench, Plus, Trash2, Phone, Mail, Cpu, UserCog, History } from "lucide-react"
import { cn } from "@/lib/utils"

type Equipment = {
  id: string
  name: string
  code: string
}

type MaintenanceContact = {
  id: string
  name: string
  phone: string
  email: string
}

export function MaintenanceModule() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([
    { id: "e1", name: "RATIONAL iCombi Pro 10-1/1", code: "SN: G11SK210528" },
    { id: "e2", name: "Metos Master hood-malli", code: "HUOLTO-ID: 44221" },
  ])

  const [contacts, setContacts] = useState<MaintenanceContact[]>([
    { id: "c1", name: "Metos Huoltopalvelu", phone: "+3582043913", email: "huolto@metos.fi" },
    { id: "c2", name: "LVI-Pekka Oy", phone: "+358400123456", email: "huolto@lvipekka.fi" },
  ])

  const [newEquip, setNewEquip] = useState({ name: "", code: "" })
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "" })

  const addEquipment = () => {
    if (!newEquip.name.trim()) return
    setEquipmentList([...equipmentList, { id: Date.now().toString(), ...newEquip }])
    setNewEquip({ name: "", code: "" })
  }

  const removeEquipment = (id: string) => {
    setEquipmentList(equipmentList.filter(e => e.id !== id))
  }

  const addContact = () => {
    if (!newContact.name.trim()) return
    setContacts([...contacts, { id: Date.now().toString(), ...newContact }])
    setNewContact({ name: "", phone: "", email: "" })
  }

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Laitteet ja huolto</h2>
        <p className="text-muted-foreground">Hallitse keittiön konekantaa ja huoltoyhteystietoja.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Laiteluettelo */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                Keittiön laitteet
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                Tallenna laitteiden nimet ja huoltokoodit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Laitteen nimi</Label>
                  <Input 
                    placeholder="Esim. Uuni 1..." 
                    value={newEquip.name}
                    onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
                    className="bg-muted/50 border-border text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Huoltokoodi</Label>
                  <Input 
                    placeholder="SN / Malli..." 
                    value={newEquip.code}
                    onChange={(e) => setNewEquip({ ...newEquip, code: e.target.value })}
                    className="bg-muted/50 border-border text-xs h-9"
                  />
                </div>
              </div>
              <Button onClick={addEquipment} className="w-full copper-gradient text-white font-bold h-9">
                <Plus className="w-4 h-4 mr-2" /> Lisää laite listaan
              </Button>

              <div className="pt-4 space-y-2">
                {equipmentList.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 hover:border-primary/40 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted/50">
                        <Wrench className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">{e.code}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => removeEquipment(e.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Huoltoyhteystiedot */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <UserCog className="w-5 h-5 text-accent" />
                Huoltoyhteystiedot
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                Pikayhteydet huoltoliikkeisiin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Huoltoliikkeen nimi</Label>
                  <Input 
                    placeholder="Nimi..." 
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="bg-muted/50 border-border text-xs h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Puhelin</Label>
                    <Input 
                      placeholder="+358..." 
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="bg-muted/50 border-border text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sähköposti</Label>
                    <Input 
                      placeholder="huolto@..." 
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="bg-muted/50 border-border text-xs h-9"
                    />
                  </div>
                </div>
                <Button onClick={addContact} className="w-full steel-detail text-background font-bold h-9">
                  <Plus className="w-4 h-4 mr-2" /> Tallenna huolto
                </Button>
              </div>

              <div className="pt-4 space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-border bg-card shadow-inner group relative">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full copper-gradient flex items-center justify-center text-white shadow-lg">
                          {c.name[0]}
                        </div>
                        <h3 className="font-headline font-bold text-sm text-foreground">{c.name}</h3>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => removeContact(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <a 
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-border/50 hover:bg-primary/20 hover:border-primary/50 transition-all group/btn"
                      >
                        <Phone className="w-4 h-4 text-accent group-hover/btn:scale-110 transition-transform" />
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground">Soita</span>
                          <span className="text-[10px] font-bold truncate">{c.phone}</span>
                        </div>
                      </a>
                      <a 
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-border/50 hover:bg-primary/20 hover:border-primary/50 transition-all group/btn"
                      >
                        <Mail className="w-4 h-4 text-accent group-hover/btn:scale-110 transition-transform" />
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground">Sähköposti</span>
                          <span className="text-[10px] font-bold truncate">{c.email}</span>
                        </div>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
