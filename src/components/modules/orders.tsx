"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ShoppingBag, Calendar as CalendarIcon, Truck, AlertCircle, ArrowRight, Plus, Package } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"

type Order = {
  id: string
  supplierId: string
  supplierName: string
  color: string
  orderDate: Date
  arrivalDate: Date
  status: 'pending' | 'shipped' | 'arrived'
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
    },
    { 
      id: "o2", 
      supplierId: "2", 
      supplierName: "Kalatukku Sjöman", 
      color: "#0ea5e9", 
      orderDate: new Date(), 
      arrivalDate: addDays(new Date(), 2),
      status: 'pending'
    }
  ])

  const [puuteItems] = useState([
    { id: "p1", text: "Kupari-puhdistusaine", priority: 'high' },
    { id: "p2", text: "Chili-öljy loppu", priority: 'medium' },
    { id: "p3", text: "Valkoviinietikka (5L)", priority: 'low' },
  ])

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [arrivalDate, setArrivalDate] = useState<Date>(addDays(new Date(), 1))

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

  // Kalenterin logiikka
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getOrdersForDay = (day: Date) => {
    return orders.filter(o => isSameDay(o.arrivalDate, day))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-accent">Tilausten hallinta</h2>
          <p className="text-muted-foreground">Seuraa saapuvia kuormia ja tee uusia tilauksia.</p>
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
                <Label>Tilauspäivä (tänään)</Label>
                <Input disabled value={format(new Date(), 'dd.MM.yyyy')} className="bg-muted/20 border-border opacity-50" />
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
                      item.priority === 'high' ? "bg-red-500" : item.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
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
                  {format(new Date(), 'MMMM yyyy', { locale: fi })}
                </CardDescription>
              </div>
              <div className="flex gap-2 text-[10px] font-bold">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-accent" /> Tilaus</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /> Toimitus</div>
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
                  const hasOrders = dayOrders.length > 0
                  
                  // Rakennetaan liukuväri jos useampi toimittaja
                  const backgroundStyle = dayOrders.length > 1 
                    ? { background: `linear-gradient(135deg, ${dayOrders.map(o => o.color).join(', ')})` }
                    : dayOrders.length === 1 
                      ? { backgroundColor: dayOrders[0].color } 
                      : {}

                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "min-h-[100px] border-r border-b border-border p-2 transition-colors relative group",
                        i % 7 === 6 ? "border-r-0" : "",
                        !isSameDay(day, new Date()) && "hover:bg-white/5"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold",
                        isSameDay(day, new Date()) ? "text-accent" : "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
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
                            <div className="flex items-center justify-between">
                              <div className="flex -space-x-1">
                                {dayOrders.slice(0, 3).map(o => (
                                  <div key={o.id} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: o.color }} />
                                ))}
                              </div>
                              <span>{dayOrders.length} kuormaa</span>
                            </div>
                          )}
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

      {/* Viimeisimmät tilaukset lista */}
      <Card className="bg-card border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-headline">Viimeisimmät tapahtumat</CardTitle>
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
