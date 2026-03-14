
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, MessageCircle, MoreHorizontal, Search, UserPlus } from "lucide-react"

type Contact = {
  id: string
  name: string
  role: string
  status: 'online' | 'offline' | 'busy'
  avatarSeed: string
}

export function DirectoryModule() {
  const contacts: Contact[] = [
    { id: "1", name: "Sarah Miller", role: "Suunnittelujohtaja", status: 'online', avatarSeed: "sarah" },
    { id: "2", name: "David Chen", role: "Vanhempi kehittäjä", status: 'busy', avatarSeed: "david" },
    { id: "3", name: "Alice Thompson", role: "Projektipäällikkö", status: 'online', avatarSeed: "alice" },
    { id: "4", name: "Mark Wilson", role: "DevOps-insinööri", status: 'offline', avatarSeed: "mark" },
    { id: "5", name: "Emily Brown", role: "Tuoteomistaja", status: 'online', avatarSeed: "emily" },
  ]

  const statusColor = (status: string) => {
    switch(status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Yhteystiedot</h2>
          <p className="text-muted-foreground">Hallitse tiimisi yhteystietoja ja ota yhteyttä välittömästi.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2">
          <UserPlus className="w-4 h-4" /> Lisää tiimin jäsen
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Etsi nimellä tai roolilla..." className="pl-10 bg-white border-accent/20" />
      </div>

      <div className="space-y-3">
        {contacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-sm border-accent/5 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-12 h-12 border border-accent/10">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed}/200/200`} />
                    <AvatarFallback>{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor(contact.status)}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{contact.name}</h3>
                  <p className="text-xs text-muted-foreground">{contact.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-accent/20 text-accent hover:bg-accent hover:text-white rounded-full">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-accent/20 text-accent hover:bg-accent hover:text-white rounded-full">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
