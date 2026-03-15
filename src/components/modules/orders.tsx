
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ShoppingBag, Calendar as CalendarIcon, Truck, AlertCircle, ArrowRight, Plus, Package, Bell, Clock, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

type Order = {
  id: string
  supplierId: string
  supplierName: string
  color: string
  orderDate: any
  arrivalDate: any
  status: 'pending' | 'shipped' | 'arrived'
}

type Reminder = {
  id: string
  date: any
  time: string
  content: string
  hasAlert: boolean
}

type Supplier = {
  id: string
  name: string
  color: string
}

interface OrdersModuleProps {
  onNavigateToSuppliers?: () => void
}

export function OrdersModule({ onNavigateToSuppliers }: OrdersModuleProps) {
  const firestore = useFirestore()
  
  const suppliersRef = useMemo(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore])
  const ordersRef = useMemo(() => (firestore ? collection(firestore, 'orders') : null), [firestore])
  const remindersRef = useMemo(() => (firestore ? collection(firestore, 'orderReminders') : null), [firestore])
  
  const { data: suppliers = [] } = useCollection<Supplier>(suppliersRef)
  const { data: orders = [] } = useCollection<Order>(ordersRef)
  const { data: reminders = [] } = useCollection<Reminder>(remindersRef)

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [arrivalDate, setArrivalDate] = useState<Date>(addDays(new Date(), 1))
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [newReminder, setNewReminder] = useState({ content: "", time: "08:00", hasAlert: true })

  const handleMakeOrder = () => {
    if (!selectedSupplierId || !firestore) return
    const supplier = suppliers.find(s => s.id === selectedSupplierId)
    if (!supplier) return

    const id = Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'orders', id)
    const orderData = {
      id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      color: supplier.color || "#b87333",
      orderDate: Timestamp.now(),
      arrivalDate: Timestamp.fromDate(arrivalDate),
      status: 'pending'
    }

    setDoc(docRef, orderData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: orderData
      }))
    })
  }

  const handleAddReminder = () => {
    if (!selectedDay || !newReminder.content.trim() || !firestore) return
    const id = Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'orderReminders', id)
    const reminderData = {
      id,
      date: Timestamp.fromDate(selectedDay),
      ...newReminder
    }

    setDoc(docRef, reminderData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: reminderData
      }))
    })
    setIsReminderDialogOpen(false)
    setNewReminder({ content: "", time: "08:00", hasAlert: true })
  }

  const removeReminder = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'orderReminders', id))
  }

  const currentMonth = new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { locale: fi })
  const calendarEnd = endOfWeek(monthEnd, { locale: fi })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getOrdersForDay = (day: Date) => {
    return orders.filter(o => {
      const date = o.arrivalDate instanceof Timestamp ? o.arrivalDate.toDate() : new Date(o.arrivalDate)
      return isSameDay(date, day)
    })
  }

  const getRemindersForDay = (day: Date) => {
    return reminders.filter(r => {
      const date = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date)
      return isSameDay(date, day)
    })
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-accent">Tilausten hallinta</h2>
          <p className="text-muted-foreground">Seuraa saapuvia kuormia ja aseta muistutuksia.</p>
        </div>
        <Button variant="outline" onClick={onNavigateToSuppliers} className="gap-2 border-accent/20 text-accent hover:bg-accent/10">
          Toimittajarekisteri <ArrowRight className="w-4 h-4" />
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent" />
                Tee uusi tilaus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Valitse toimittaja</Label>
                <Select onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Valitse toimittaja..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Toivottu saapuminen</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-muted/50 border-border">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {arrivalDate ? format(arrivalDate, 'dd.MM.yyyy') : <span>Valitse päivä</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar mode="single" selected={arrivalDate} onSelect={(d) => d && setArrivalDate(d)} initialFocus locale={fi} />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleMakeOrder} className="w-full copper-gradient text-white font-bold mt-2">
                <Plus className="w-4 h-4 mr-2" /> Lähetä tilaus
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="bg-card border-border shadow-2xl h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <div>
                <CardTitle className="font-headline text-xl text-foreground">Toimituskalenteri</CardTitle>
                <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                  {format(currentMonth, 'MMMM yyyy', { locale: fi })} • Klikkaa päivää asettaaksesi muistutuksen
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border bg-muted/20">
                {['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].map(day => (
                  <div key={day} className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-r border-border last:border-0">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, i) => {
                  const dayOrders = getOrdersForDay(day)
                  const dayReminders = getRemindersForDay(day)
                  const hasOrders = dayOrders.length > 0
                  const hasReminders = dayReminders.length > 0
                  const isCurrentMonth = isSameMonth(day, currentMonth)

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => { setSelectedDay(day); setIsReminderDialogOpen(true); }}
                      className={cn(
                        "min-h-[100px] border-r border-b border-border p-2 transition-colors relative group cursor-pointer",
                        i % 7 === 6 ? "border-r-0" : "",
                        !isCurrentMonth ? "opacity-30 bg-muted/5" : (isSameDay(day, new Date()) ? "bg-primary/5" : "hover:bg-white/5")
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn("text-xs font-bold", isSameDay(day, new Date()) ? "text-accent" : "text-muted-foreground")}>{format(day, 'd')}</span>
                        {hasReminders && <Bell className="w-3 h-3 text-accent animate-pulse" />}
                      </div>
                      {hasOrders && (
                        <div className="mt-1 p-1 rounded-md text-[9px] font-bold text-white shadow-lg bg-accent">
                          {dayOrders.length} kuormaa
                        </div>
                      )}
                      {dayReminders.map(r => (
                        <div key={r.id} className="mt-1 bg-accent/20 border border-accent/30 text-[8px] text-accent p-0.5 rounded truncate">
                          {r.time} {r.content}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="font-headline text-accent">Aseta muistutus: {selectedDay ? format(selectedDay, 'd.M.yyyy') : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mitä tilataan / Huomioitavaa</Label>
              <Input placeholder="esim. Kalat, Vihannekset..." value={newReminder.content} onChange={(e) => setNewReminder({...newReminder, content: e.target.value})} className="bg-muted/50 border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kellonaika</Label>
                <Input type="time" value={newReminder.time} onChange={(e) => setNewReminder({...newReminder, time: e.target.value})} className="bg-muted/50 border-border" />
              </div>
              <div className="flex items-center justify-between pt-8">
                <Label className="cursor-pointer" htmlFor="alert-switch">Hälytys käytössä</Label>
                <Switch id="alert-switch" checked={newReminder.hasAlert} onCheckedChange={(checked) => setNewReminder({...newReminder, hasAlert: checked})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>Peruuta</Button>
            <Button onClick={handleAddReminder} className="copper-gradient text-white">Tallenna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
