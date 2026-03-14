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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

type Order = {
  id: string
  supplierId: string
  supplierName: string
  color: string
  orderDate: Date
  arrivalDate: Date
  status: 'pending' | 'shipped' | 'arrived'
}

type Reminder = {
  id: string
  date: Date
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
  // Mockattua dataa
  const [suppliers] = useState<Supplier[]>([
    { id: "1", name: "Tukku-Eero Oy", color: "#b87333" }, // Kupari
    { id: "2", name: "Kalatukku Sjöman", color: "#0ea5e9" }, // Taivas
    { id: "3", name: "Vihannespalvelu", color: "#10b981" }, // Smaragdi
  ])

  const [orders, setOrders] = useState<Order[]>([
    { 
      id: "o1", 
      supplierId: "1", 
      supplierName: "Tukku-Eero Oy", 
      color: "#b87333", 
      orderDate: new Date(), 
      arrivalDate: addDays(new Date(), 2),
      status: 'pending'
    }
  ])

  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: "r1",
      date: addDays(new Date(), 1),
      time: "12:00",
      content: "Kalatilaus",
      hasAlert: true
    }
  ])

  const [puuteItems] = useState([
    { id: "p1", text: "Kupari-puhdistusaine", priority: 'high' },
    { id: "p2", text: "Chili-öljy loppu", priority: 'medium' },
  ])

  // Tilauslomakkeen tila
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [arrivalDate, setArrivalDate] = useState<Date>(addDays(new Date(), 1))

  // Muistutuslomakkeen tila
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [newReminder, setNewReminder] = useState({ content: "", time: "08:00", hasAlert: true })

  const handleMakeOrder = () => {
    if (!selectedSupplierId) return
    const supplier = suppliers.find(s => s.id === selectedSupplierId)
    if (!supplier) return

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      supplierId: supplier.id,
      supplierName: supplier.name,
      color: supplier.color,
      orderDate: new Date(),
      arrivalDate: arrivalDate,
      status: 'pending'
    }
    setOrders([...orders, newOrder])
  }

  const handleAddReminder = () => {
    if (!selectedDay || !newReminder.content.trim()) return
    const reminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDay,
      ...newReminder
    }
    setReminders([...reminders, reminder])
    setIsReminderDialogOpen(false)
    setNewReminder({ content: "", time: "08:00", hasAlert: true })
  }

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id))
  }

  // Kalenterin logiikka
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getOrdersForDay = (day: Date) => {
    return orders.filter(o => isSameDay(o.arrivalDate, day))
  }

  const getRemindersForDay = (day: Date) => {
    return reminders.filter(r => isSameDay(r.date, day))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-accent">Tilausten hallinta</h2>
          <p className="text-muted-foreground">Seuraa saapuvia kuormia ja aseta muistutuksia.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onNavigateToSuppliers}
          className="gap-2 border-accent/20 text-accent hover:bg-accent/10"
        >
          Toimittajarekisteri <ArrowRight className="w-4 h-4" />
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vasen sarake: Uusi tilaus ja puutteet */}
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
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
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

              <Button onClick={handleMakeOrder} className="w-full copper-gradient text-white font-bold mt-2">
                <Plus className="w-4 h-4 mr-2" /> Lähetä tilaus
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Puute-lista huomiot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {puuteItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-border/50 text-xs">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      item.priority === 'high' ? "bg-red-500" : "bg-amber-500"
                    )} />
                    <span className="flex-1 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Oikea sarake: Seinäkalenteri */}
        <div className="lg:col-span-8">
          <Card className="bg-card border-border shadow-2xl h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <div>
                <CardTitle className="font-headline text-xl text-foreground">Toimituskalenteri</CardTitle>
                <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                  {format(new Date(), 'MMMM yyyy', { locale: fi })} • Klikkaa päivää asettaaksesi muistutuksen
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border">
                {['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].map(day => (
                  <div key={day} className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-r border-border last:border-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, i) => {
                  const dayOrders = getOrdersForDay(day)
                  const dayReminders = getRemindersForDay(day)
                  const hasOrders = dayOrders.length > 0
                  const hasReminders = dayReminders.length > 0
                  
                  const backgroundStyle = dayOrders.length > 1 
                    ? { background: `linear-gradient(135deg, ${dayOrders.map(o => o.color).join(', ')})` }
                    : dayOrders.length === 1 
                      ? { backgroundColor: dayOrders[0].color } 
                      : {}

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => {
                        setSelectedDay(day);
                        setIsReminderDialogOpen(true);
                      }}
                      className={cn(
                        "min-h-[100px] border-r border-b border-border p-2 transition-colors relative group cursor-pointer",
                        i % 7 === 6 ? "border-r-0" : "",
                        !isSameDay(day, new Date()) ? "hover:bg-white/5" : "bg-primary/5"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-xs font-bold",
                          isSameDay(day, new Date()) ? "text-accent" : "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {hasReminders && (
                          <Bell className="w-3 h-3 text-accent animate-pulse" />
                        )}
                      </div>
                      
                      {hasOrders && (
                        <div 
                          className="mt-1 p-1 rounded-md text-[9px] font-bold text-white shadow-lg animate-in zoom-in-95 duration-300 overflow-hidden"
                          style={backgroundStyle}
                        >
                          {dayOrders.length === 1 ? (
                            <div className="flex items-center gap-1 truncate">
                              <Truck className="w-3 h-3" />
                              {dayOrders[0].supplierName}
                            </div>
                          ) : (
                            <span>{dayOrders.length} kuormaa</span>
                          )}
                        </div>
                      )}

                      {hasReminders && (
                        <div className="mt-1 space-y-1">
                          {dayReminders.map(r => (
                            <div key={r.id} className="bg-accent/20 border border-accent/30 text-[8px] text-accent p-0.5 rounded flex items-center gap-1">
                              <Clock className="w-2 h-2" />
                              <span className="truncate">{r.time} {r.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Muistutus Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent">
              Aseta muistutus: {selectedDay ? format(selectedDay, 'd.M.yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mitä tilataan / Huomioitavaa</Label>
              <Input 
                placeholder="esim. Kalat, Vihannekset..." 
                value={newReminder.content}
                onChange={(e) => setNewReminder({...newReminder, content: e.target.value})}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kellonaika</Label>
                <Input 
                  type="time" 
                  value={newReminder.time}
                  onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="flex items-center justify-between pt-8">
                <Label className="cursor-pointer" htmlFor="alert-switch">Hälytys käytössä</Label>
                <Switch 
                  id="alert-switch"
                  checked={newReminder.hasAlert}
                  onCheckedChange={(checked) => setNewReminder({...newReminder, hasAlert: checked})}
                />
              </div>
            </div>

            {selectedDay && getRemindersForDay(selectedDay).length > 0 && (
              <div className="pt-4 border-t border-border">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Päivän muistutukset</Label>
                <div className="space-y-2 mt-2">
                  {getRemindersForDay(selectedDay).map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white/5 p-2 rounded text-xs border border-border">
                      <span>{r.time} - {r.content}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeReminder(r.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)} className="border-border">Peruuta</Button>
            <Button onClick={handleAddReminder} className="copper-gradient text-white">Tallenna muistutus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viimeisimmät tilaukset lista */}
      <Card className="bg-card border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">Viimeisimmät tilaukset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {orders.slice().reverse().map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white/5 border border-border" style={{ borderLeft: `4px solid ${order.color}` }}>
                    <Package className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{order.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Tilattu: {format(order.orderDate, 'dd.MM.')} • Saapuu: {format(order.arrivalDate, 'dd.MM.')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    ODOTTAA
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
