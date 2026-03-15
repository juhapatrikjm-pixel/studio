
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ListTodo, Plus, Trash2, Bell, Clock, Info, Save, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  description: string
  alert: boolean
  color: string
}

type TodoTask = {
  id: string
  text: string
  completed: boolean
  createdAt: any
}

const EVENT_COLORS = [
  { name: "Kupari", value: "bg-[#b87333]", hex: "#b87333" },
  { name: "Teräs", value: "bg-[#71717a]", hex: "#71717a" },
  { name: "Hälytys", value: "bg-destructive", hex: "#ef4444" },
  { name: "Varaus", value: "bg-emerald-600", hex: "#059669" },
  { name: "Huolto", value: "bg-blue-600", hex: "#2563eb" },
]

export function TodoCalendarModule() {
  const firestore = useFirestore()
  const { toast } = useToast()

  const eventsRef = useMemo(() => (firestore ? collection(firestore, 'calendarEvents') : null), [firestore])
  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'todoTasks') : null), [firestore])
  const tasksQuery = useMemo(() => tasksRef ? query(tasksRef, orderBy('createdAt', 'asc')) : null, [tasksRef])

  const { data: events = [] } = useCollection<CalendarEvent>(eventsRef)
  const { data: tasks = [] } = useCollection<TodoTask>(tasksQuery)

  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [newTodo, setNewTodo] = useState("")
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    time: "08:00", 
    alert: false, 
    description: "", 
    color: EVENT_COLORS[0].hex 
  })

  useEffect(() => {
    setCurrentMonth(new Date())
  }, [])

  const calendarDays = useMemo(() => {
    if (!currentMonth) return []
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: fi })
    const endDate = endOfWeek(monthEnd, { locale: fi })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const handleAddTodo = () => {
    if (!newTodo.trim() || !firestore) return
    const taskId = Math.random().toString(36).substr(2, 9)
    const taskRef = doc(firestore, 'todoTasks', taskId)
    const taskData = {
      id: taskId,
      text: newTodo,
      completed: false,
      createdAt: serverTimestamp()
    }
    setDoc(taskRef, taskData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'create',
        requestResourceData: taskData
      }))
    })
    setNewTodo("")
  }

  const toggleTodo = (id: string, completed: boolean) => {
    if (!firestore) return
    const taskRef = doc(firestore, 'todoTasks', id)
    updateDoc(taskRef, { completed: !completed })
  }

  const deleteTodo = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'todoTasks', id))
  }

  const handleAddEvent = () => {
    if (!newEvent.title.trim() || !selectedDate || !firestore) return
    const eventId = Math.random().toString(36).substr(2, 9)
    const eventRef = doc(firestore, 'calendarEvents', eventId)
    const eventData = {
      id: eventId,
      title: newEvent.title,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: newEvent.time,
      alert: newEvent.alert,
      description: newEvent.description,
      color: newEvent.color
    }
    setDoc(eventRef, eventData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: eventRef.path,
        operation: 'create',
        requestResourceData: eventData
      }))
    })
    setNewEvent({ title: "", time: "08:00", alert: false, description: "", color: EVENT_COLORS[0].hex })
    setIsEventDialogOpen(false)
    toast({ title: "Tapahtuma tallennettu" })
  }

  const deleteEvent = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'calendarEvents', id))
  }

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return events.filter(e => e.date === dateStr)
  }

  const getDayStyle = (day: Date) => {
    const dayEvents = getEventsForDay(day)
    if (dayEvents.length === 0) return null
    
    const colors = Array.from(new Set(dayEvents.map(e => e.color)))
    if (colors.length === 1) return { backgroundColor: colors[0] }
    
    return {
      background: `linear-gradient(135deg, ${colors.join(', ')})`
    }
  }

  if (!currentMonth) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Kalenteri & To do</h2>
        <p className="text-muted-foreground">Hallitse keittiön tärkeitä päiviä ja tehtäviä seinäkalenterinäkymällä.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-accent" />
                Tehtävälista
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Lisää tehtävä..." 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                  className="bg-muted/30 border-border"
                />
                <Button onClick={handleAddTodo} className="copper-gradient"><Plus className="w-4 h-4" /></Button>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 group">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-accent/40">#{index + 1}</span>
                        <Checkbox 
                          checked={task.completed}
                          onCheckedChange={() => toggleTodo(task.id, task.completed)}
                        />
                        <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                          {task.text}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteTodo(task.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="bg-card border-border shadow-2xl overflow-hidden h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-secondary/10">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-5 h-5 text-accent" />
                </Button>
                <CardTitle className="font-headline text-xl text-foreground min-w-[150px] text-center">
                  {format(currentMonth, 'MMMM yyyy', { locale: fi }).toUpperCase()}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-5 h-5 text-accent" />
                </Button>
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
                  const dayEvents = getEventsForDay(day)
                  const dayStyle = getDayStyle(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => { setSelectedDate(day); setIsEventDialogOpen(true); }}
                      className={cn(
                        "min-h-[100px] border-r border-b border-border p-2 transition-all relative group cursor-pointer",
                        i % 7 === 6 ? "border-r-0" : "",
                        !isCurrentMonth ? "opacity-30 bg-muted/5" : "bg-card hover:bg-white/5",
                        isToday && "ring-1 ring-inset ring-accent/50 bg-accent/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-accent text-white" : "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayEvents.some(e => e.alert) && <Bell className="w-3 h-3 text-accent animate-pulse" />}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id} 
                            className="text-[9px] p-1 rounded border border-white/10 text-white font-bold truncate shadow-sm flex items-center gap-1"
                            style={{ backgroundColor: event.color }}
                          >
                            <Clock className="w-2 h-2" /> {event.time} {event.title}
                          </div>
                        ))}
                      </div>

                      {dayEvents.length > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 w-full h-1 opacity-50"
                          style={dayStyle || {}}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-accent flex items-center gap-2">
              <Plus className="w-5 h-5" /> 
              {selectedDate ? format(selectedDate, 'EEEE d. MMMM', { locale: fi }) : 'Uusi merkintä'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Lisää uusi kalenteritapahtuma valitulle päivälle.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tapahtuman otsikko</Label>
              <Input 
                placeholder="Esim. Keittiön suursiivous..." 
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                className="bg-muted/30 border-border"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kellonaika</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                    className="pl-10 bg-muted/30 border-border"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-8">
                <Label className="cursor-pointer" htmlFor="alert-switch">Hälytys</Label>
                <Switch 
                  id="alert-switch" 
                  checked={newEvent.alert} 
                  onCheckedChange={(checked) => setNewEvent({...newEvent, alert: checked})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tunnusväri</Label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setNewEvent({...newEvent, color: c.hex})}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      c.value,
                      newEvent.color === c.hex ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kuvaus / Lisätiedot</Label>
              <Input 
                placeholder="Vapaa kuvaus..." 
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                className="bg-muted/30 border-border"
              />
            </div>
          </div>

          {selectedDate && getEventsForDay(selectedDate).length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Päivän muut merkinnät</Label>
              <div className="space-y-1">
                {getEventsForDay(selectedDate).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-xs font-bold">{e.time} {e.title}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteEvent(e.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} className="border-border">Peruuta</Button>
            <Button onClick={handleAddEvent} className="copper-gradient text-white font-bold gap-2">
              <Save className="w-4 h-4" /> Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
