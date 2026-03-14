
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarDays, ListTodo, Plus, Trash2, Bell, Clock, Info, CheckCircle2 } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { format, isSameDay } from "date-fns"
import { fi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Switch } from "@/components/ui/switch"

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  description: string
  alert: boolean
}

type TodoTask = {
  id: string
  text: string
  completed: boolean
  createdAt: any
}

export function TodoCalendarModule() {
  const firestore = useFirestore()
  const { toast } = useToast()

  const eventsRef = useMemo(() => (firestore ? collection(firestore, 'calendarEvents') : null), [firestore])
  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'todoTasks') : null), [firestore])

  const tasksQuery = useMemo(() => tasksRef ? query(tasksRef, orderBy('createdAt', 'asc')) : null, [tasksRef])

  const { data: events = [] } = useCollection<CalendarEvent>(eventsRef)
  const { data: tasks = [] } = useCollection<TodoTask>(tasksQuery)

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [newTodo, setNewTodo] = useState("")
  const [newEvent, setNewEvent] = useState({ title: "", time: "08:00", alert: false, description: "" })

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
      description: newEvent.description
    }
    setDoc(eventRef, eventData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: eventRef.path,
        operation: 'create',
        requestResourceData: eventData
      }))
    })
    setNewEvent({ title: "", time: "08:00", alert: false, description: "" })
    toast({ title: "Tapahtuma tallennettu" })
  }

  const deleteEvent = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'calendarEvents', id))
  }

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return events.filter(e => e.date === dateStr)
  }, [events, selectedDate])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Kalenteri & To do</h2>
        <p className="text-muted-foreground">Hallitse tärkeitä päiviä ja juoksevia tehtäviä.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TO DO LISTA */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-accent" />
                Yleinen To do -lista
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                Juoksevat asiat numeroidussa järjestyksessä
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Lisää uusi tehtävä..." 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                  className="bg-muted/30 border-border"
                />
                <Button onClick={handleAddTodo} className="copper-gradient"><Plus className="w-4 h-4" /></Button>
              </div>

              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 hover:border-primary/40 transition-all group">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-accent/60 shrink-0">#{index + 1}</span>
                        <Checkbox 
                          checked={task.completed}
                          onCheckedChange={() => toggleTodo(task.id, task.completed)}
                          className="data-[state=checked]:bg-green-500 border-accent/40"
                        />
                        <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                          {task.text}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => deleteTodo(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic text-xs">
                      Ei aktiivisia tehtäviä.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* KALENTERI JA TAPAHTUMAT */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Kalenteri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={setSelectedDate} 
                  locale={fi}
                  className="rounded-md border-none"
                />
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Uusi tapahtuma
                </CardTitle>
                <CardDescription className="text-[10px] font-bold">
                  {selectedDate ? format(selectedDate, 'd. MMMM yyyy', { locale: fi }) : "Valitse päivä"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Otsikko</Label>
                  <Input 
                    placeholder="Esim. Alv-tarkistus..." 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="bg-muted/30 border-border h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Kellonaika</Label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input 
                        type="time" 
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="pl-8 bg-muted/30 border-border h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end gap-2 pb-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hälytys</Label>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newEvent.alert} 
                        onCheckedChange={(checked) => setNewEvent({ ...newEvent, alert: checked })}
                        className="scale-75 origin-left"
                      />
                      <Bell className={cn("w-3.5 h-3.5", newEvent.alert ? "text-accent" : "text-muted-foreground")} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Kuvaus</Label>
                  <Input 
                    placeholder="Lisätiedot..." 
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="bg-muted/30 border-border h-8 text-sm"
                  />
                </div>
                <Button onClick={handleAddEvent} className="w-full copper-gradient text-white font-bold h-9 mt-2">
                  <Save className="w-4 h-4 mr-2" /> Tallenna päivälle
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-50" />
            <CardHeader>
              <CardTitle className="font-headline text-lg text-foreground">
                Tapahtumat: {selectedDate ? format(selectedDate, 'd.M.', { locale: fi }) : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDayEvents.map(event => (
                  <div key={event.id} className="p-4 rounded-xl border border-border bg-white/5 group relative transition-all hover:border-primary/40">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-muted/50 border border-border">
                          {event.alert ? <Bell className="w-4 h-4 text-accent animate-pulse" /> : <Info className="w-4 h-4 text-accent/60" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{event.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                            <Clock className="w-3 h-3" /> {event.time}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {event.description && (
                      <p className="text-[11px] text-muted-foreground italic border-l border-accent/20 pl-3 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
                {selectedDayEvents.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic text-xs">
                    Ei merkintöjä valitulle päivälle.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
