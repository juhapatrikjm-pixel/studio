"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Phone, Mail, Globe, MessageSquare, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

type Supplier = {
  id: string
  name: string
  url: string
  phone: string
  email: string
  color: string
}

const supplierConverter: FirestoreDataConverter<Supplier> = {
  toFirestore: (supplier: Supplier): DocumentData => {
    const { id, ...data } = supplier;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options): Supplier => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      url: data.url,
      phone: data.phone,
      email: data.email,
      color: data.color
    };
  }
};

const PRESET_COLORS = [
  { name: "Kupari", value: "bg-[#b87333]" },
  { name: "Teräs", value: "bg-[#d4d4d8]" },
  { name: "Smaragdi", value: "bg-emerald-500" },
  { name: "Taivas", value: "bg-sky-500" },
  { name: "Viini", value: "bg-rose-700" },
  { name: "Kulta", value: "bg-amber-500" },
]

export function SuppliersModule() {
  const firestore = useFirestore()
  const suppliersRef = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore])
  const { data: suppliers = [] } = useCollection<Supplier>(suppliersRef)

  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: "",
    url: "",
    phone: "",
    email: "",
    color: PRESET_COLORS[0].value
  })

  const addSupplier = () => {
    if (!formData.name.trim() || !suppliersRef) return
    const docRef = doc(suppliersRef)
    
    setDoc(docRef, formData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'create',
          requestResourceData: formData
        }))
      })
    setFormData({ name: "", url: "", phone: "", email: "", color: PRESET_COLORS[0].value })
  }

  const removeSupplier = (id: string) => {
    if (!suppliersRef) return
    const docRef = doc(suppliersRef, id)
    deleteDoc(docRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }))
    })
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Toimittajarekisteri</h2>
        <p className="text-muted-foreground">Hallitse tukkujen ja yhteistyökumppaneiden yhteystietoja.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-border shadow-xl h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent">Lisää uusi toimittaja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Toimittajan nimi</Label>
              <Input 
                id="name" 
                placeholder="Esim. Kasvistukku" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Tilaussivun URL</Label>
              <Input 
                id="url" 
                placeholder="https://..." 
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Puhelinnumero</Label>
              <Input 
                id="phone" 
                placeholder="+358..." 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Sähköposti</Label>
              <Input 
                id="email" 
                placeholder="nimi@yritys.fi" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Tunnusväri</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setFormData({...formData, color: c.value})}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      c.value,
                      formData.color === c.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <Button onClick={addSupplier} className="w-full copper-gradient text-white mt-4 font-bold">
              <Plus className="w-4 h-4 mr-2" /> Tallenna Toimittaja
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
              Ei tallennettuja toimittajia. Lisää ensimmäinen vasemmalta.
            </div>
          )}
          {suppliers.map((s) => (
            <Card key={s.id} className="bg-card border-border shadow-md hover:shadow-xl transition-all relative overflow-hidden group">
              <div className={cn("absolute top-0 left-0 w-full h-1", s.color)} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full shadow-sm", s.color)} />
                    <CardTitle className="text-lg font-headline">{s.name}</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSupplier(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex justify-around items-center p-3 bg-white/5 rounded-xl border border-border/50">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group/icon hover:scale-110 transition-transform">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-accent group-hover/icon:bg-primary group-hover/icon:text-white transition-colors">
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover/icon:text-accent">VERKKO</span>
                  </a>
                  <a href={`tel:${s.phone}`} className="flex flex-col items-center gap-1 group/icon hover:scale-110 transition-transform">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-accent group-hover/icon:bg-primary group-hover/icon:text-white transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover/icon:text-accent">SOITA</span>
                  </a>
                  <a href={`sms:${s.phone}`} className="flex flex-col items-center gap-1 group/icon hover:scale-110 transition-transform">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-accent group-hover/icon:bg-primary group-hover/icon:text-white transition-colors">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover/icon:text-accent">VIESTI</span>
                  </a>
                  <a href={`mailto:${s.email}`} className="flex flex-col items-center gap-1 group/icon hover:scale-110 transition-transform">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-accent group-hover/icon:bg-primary group-hover/icon:text-white transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover/icon:text-accent">MAIL</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
