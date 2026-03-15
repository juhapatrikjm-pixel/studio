
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ShoppingBag, Calendar as CalendarIcon, Truck, AlertCircle, ArrowRight, Plus, Package, Bell, Clock, Trash2, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, Timestamp, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { ScrollArea } from "@/components/ui/scroll-area"

type Order = {
  id: string
  supplierId: string | null
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
  
  const ordersQuery = useMemo(() => {
    if (!ordersRef) return null
    return query(ordersRef, orderBy('arrivalDate', 'desc'))
  }, [ordersRef])
  const { data: orders = [] } = useCollection<Order>(ordersQuery)
  
  const { data: reminders = [] } = useCollection<Reminder>(remindersRef)

  const [supplierNameInput, setSupplierNameInput] = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [arrivalDate, setArrivalDate] = useState<Date>(addDays(new Date(), 1))
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [newReminder, setNewReminder] = useState({ content: "", time: "08:00", hasAlert: true })
  
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentMonth(new Date())
  }, [])

  const handleMakeOrder = () => {
    if (!supplierNameInput.trim() || !firestore) return
    
    // Etsitään väri: joko valitulta toimittajalta tai oletus "ruostumaton teräs"
    const existingSupplier = suppliers.find(s => s.id === selectedSupplierId || s.name.toLowerCase() === supplierNameInput.toLowerCase())
    const color = existingSupplier?.color || "bg-[#71717a]"
    const supplierId = existingSupplier?.id || null

    const id = Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'orders', id)
    const orderData = {
      id,
      supplierId: supplierId,
      supplierName: supplierNameInput,
      color: color,
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
    setSupplierNameInput("")
    setSelectedSupplierId(null)
  }

  const handleDeleteOrder = (id: string) => {
    if (!firestore) return
    const docRef = doc(firestore, 'orders', id)
    deleteDoc(docRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
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

  const calendarDays = useMemo(() => {
    if (!currentMonth) return []
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { locale: fi, weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { locale: fi, weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

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

  if (!currentMonth) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
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
                <Label>Kirjoita tai valitse toimittaja</Label>
                <div className="relative group">
                  <Input 
                    placeholder="Esim. Kesko, Valio..." 
                    value={supplierNameInput}
                    onChange={(e) => {
                      setSupplierNameInput(e.target.value)
                      setSelectedSupplierId(null)
                    }}
                    className="bg-muted/50 border-border pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                {suppliers.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {suppliers.slice(0, 5).map(s => (
                      <button 
                        key={s.id}
                        onClick={() => {
                          setSupplierNameInput(s.name)
                          setSelectedSupplierId(s.id)
                        }}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                          selectedSupplierId === s.id ? "bg-accent text-white border-accent" : "bg-muted/30 border-border text-muted-foreground hover:border-accent/40"
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Toivottu saapuminen</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-muted/50 border-border h-11">
                      <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                      {arrivalDate ? format(arrivalDate, 'dd.MM.yyyy', { locale: fi }) : <span>Valitse päivä</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border shadow-2xl" align="start">
                    <Calendar 
                      mode="single" 
                      selected={arrivalDate} 
                      onSelect={(d) => d && setArrivalDate(d)} 
                      initialFocus 
                      locale={fi}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleMakeOrder} className="w-full copper-gradient text-white font-bold mt-2 h-11 shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> Lähetä tilaus
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-headline uppercase tracking-widest text-accent flex items-center gap-2">
                <Package className="w-4 h-4" /> Aktiiviset tilaukset
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ScrollArea className="h-[350px]">
                <div className="space-y-3 pr-4">
                  {orders.map(order => (
                    <div key={order.id} className="p-3 rounded-xl border border-border bg-white/5 relative group animate-in slide-in-from-left-2 transition-all hover:border-accent/30 shadow-inner">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", order.color)} />
                          <span className="text-sm font-bold">{order.supplierName}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-accent/60" />
                          <span>Tilattu: {order.orderDate instanceof Timestamp ? format(order.orderDate.toDate(), 'd.M. HH:mm') : '---'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-accent" />
                          <span className="text-foreground">Saapuu: {order.arrivalDate instanceof Timestamp ? format(order.arrivalDate.toDate(), 'd.M.yyyy') : '---'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="py-20 text-center text-xs text-muted-foreground italic border-2 border-dashed border-border rounded-xl">Ei aktiivisia tilauksia.</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="bg-card border-border shadow-2xl h-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-secondary/10">
              <div>
                <CardTitle className="font-headline text-xl text-foreground">Toimituskalenteri</CardTitle>
                <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest mt-1">
                  {format(currentMonth, 'MMMM yyyy', { locale: fi })} • Klikkaa päivää asettaaksesi muistutuksen
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border bg-muted/20">
                {['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-bold text-muted-foreground uppercase border-r border-border last:border-0">{day}</div>
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
                        "min-h-[110px] border-r border-b border-border p-2 transition-all relative group cursor-pointer",
                        i % 7 === 6 ? "border-r-0" : "",
                        !isCurrentMonth ? "opacity-30 bg-muted/5" : (isSameDay(day, new Date()) ? "bg-primary/5" : "hover:bg-white/5 shadow-inner")
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full", isSameDay(day, new Date()) ? "bg-accent text-white" : "text-muted-foreground")}>{format(day, 'd')}</span>
                        {hasReminders && <Bell className="w-3 h-3 text-accent animate-pulse" />}
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {dayOrders.map(order => (
                          <div key={order.id} className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-md truncate border border-white/10", order.color)}>
                            {order.supplierName}
                          </div>
                        ))}
                        {dayReminders.map(r => (
                          <div key={r.id} className="bg-accent/20 border border-accent/30 text-[8px] text-accent p-1 rounded-sm truncate font-medium">
                            <Clock className="w-2 h-2 inline mr-1" /> {r.time} {r.content}
                          </div>
                        ))}
                      </div>
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
          <DialogHeader><DialogTitle className="font-headline text-accent">Aseta muistutus: {selectedDay ? format(selectedDay, 'd.M.yyyy', { locale: fi }) : ''}</DialogTitle></DialogHeader>
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
