
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShieldCheck, Plus, Trash2, Thermometer, ClipboardCheck, AlertTriangle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp, Timestamp } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { format, differenceInDays } from "date-fns"
import { fi } from "date-fns/locale"

type SMTask = {
  id: string
  name: string
  type: 'fridge' | 'task'
  description?: string
}

type SMRecord = {
  id: string
  date: any
  completedBy: string
  status: boolean
  values: Record<string, string>
}

export function OmavalvontaStatusHeader({ record }: { record: SMRecord | null }) {
  // Tarkistetaan onko päivämäärä olemassa (serverTimestamp voi olla hetken null)
  const recordDate = record?.date instanceof Timestamp ? record.date.toDate() : null
  
  // Lasketaan päivät vain jos päivämäärä on tiedossa. 
  // Jos record on olemassa mutta päivämäärä puuttuu, oletetaan se tuoreeksi (0).
  const daysSince = recordDate 
    ? differenceInDays(new Date(), recordDate) 
    : (record ? 0 : 999)
  
  const isCritical = daysSince >= 7
  const isOk = record?.status && daysSince === 0

  return (
    <Card className={cn(
      "w-full border-2 transition-all duration-1000 mb-6",
      isCritical ? "border-destructive animate-pulse bg-destructive/10" : "border-green-500/30 bg-green-500/5",
      isOk && "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
    )}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
            isCritical ? "bg-destructive text-white" : "bg-green-500 text-white"
          )}>
            {isCritical ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg">
              {isCritical ? "HUOMIO: Omavalvonta vanhentunut" : "Omavalvonta ajantasalla"}
            </h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              {recordDate 
                ? `Viimeisin kirjaus: ${format(recordDate, 'd.M.yyyy')} - ${record?.completedBy}` 
                : record 
                  ? "Päivitetään..." 
                  : "Ei aiempia kirjauksia"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={cn(
             "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
             isOk ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
           )}>
             {isOk ? "TÄNÄÄN TEHTY" : "ODOTTAA"}
           </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OmavalvontaModule() {
  const firestore = useFirestore()
  
  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'selfMonitoringTasks') : null), [firestore])
  const recordsRef = useMemo(() => (firestore ? collection(firestore, 'selfMonitoringRecords') : null), [firestore])
  
  const { data: tasks = [] } = useCollection<SMTask>(tasksRef)
  
  const recordsQuery = useMemo(() => {
    if (!recordsRef) return null
    return query(recordsRef, orderBy('date', 'desc'), limit(1))
  }, [recordsRef])
  
  const { data: records = [] } = useCollection<SMRecord>(recordsQuery)
  
  const latestRecord = records[0] || null
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({})
  const [isCompletedToday, setIsCompletedToday] = useState(false)
  const [userName, setUserName] = useState("John Smith")

  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskType, setNewTaskType] = useState<'fridge' | 'task'>('fridge')

  useEffect(() => {
    if (latestRecord && latestRecord.date instanceof Timestamp) {
      const date = latestRecord.date.toDate()
      if (differenceInDays(new Date(), date) === 0) {
        setIsCompletedToday(latestRecord.status)
        setCurrentValues(latestRecord.values || {})
        setUserName(latestRecord.completedBy)
      } else {
        setIsCompletedToday(false)
        setCurrentValues({})
      }
    }
  }, [latestRecord])

  const addTask = () => {
    if (!newTaskName.trim() || !firestore) return
    const id = Math.random().toString(36).substr(2, 9)
    const taskRef = doc(firestore, 'selfMonitoringTasks', id)
    
    setDoc(taskRef, {
      id,
      name: newTaskName,
      type: newTaskType,
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'create'
      }))
    })
    setNewTaskName("")
  }

  const removeTask = (id: string) => {
    if (!firestore) return
    const taskRef = doc(firestore, 'selfMonitoringTasks', id)
    deleteDoc(taskRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'delete'
      }))
    })
  }

  const handleComplete = (checked: boolean) => {
    if (!firestore) return
    const recordId = format(new Date(), 'yyyy-MM-dd')
    const recordRef = doc(firestore, 'selfMonitoringRecords', recordId)
    
    setDoc(recordRef, {
      date: serverTimestamp(),
      completedBy: userName,
      status: checked,
      values: currentValues
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: recordRef.path,
        operation: 'write'
      }))
    })
    setIsCompletedToday(checked)
  }

  const updateValue = (taskId: string, val: string) => {
    setCurrentValues(prev => ({ ...prev, [taskId]: val }))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Omavalvonta</h2>
        <p className="text-muted-foreground">Päivittäiset lämpötilat ja keittiöhygienia.</p>
      </header>

      <OmavalvontaStatusHeader record={latestRecord} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tehtävien hallinta & Kuittaus */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <div>
                <CardTitle className="font-headline text-lg">Päivän kirjaukset</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                  {format(new Date(), 'EEEE d. MMMM', { locale: fi })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border">
                <Label htmlFor="done-switch" className="text-xs font-bold cursor-pointer">TEHTY</Label>
                <Switch 
                  id="done-switch" 
                  checked={isCompletedToday} 
                  onCheckedChange={handleComplete}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-border mb-6">
                <User className="w-4 h-4 text-accent" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Kirjaaja</p>
                  <Input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-7 bg-transparent border-none p-0 text-sm font-bold focus-visible:ring-0"
                  />
                </div>
              </div>

              {tasks.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
                  Ei määriteltyjä tehtäviä. Lisää kylmiöitä tai tehtäviä oikealta.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border border-border bg-card shadow-inner group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {task.type === 'fridge' ? <Thermometer className="w-4 h-4 text-accent" /> : <ClipboardCheck className="w-4 h-4 text-accent" />}
                        <span className="text-sm font-bold">{task.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input 
                        placeholder={task.type === 'fridge' ? "Lämpötila °C" : "Kuittaus / Huomio"}
                        value={currentValues[task.id] || ""}
                        onChange={(e) => updateValue(task.id, e.target.value)}
                        className="h-9 bg-muted/50 border-border text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lisääminen */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm font-headline uppercase tracking-wider text-accent">Lisää uusi kohde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nimi</Label>
                <Input 
                  placeholder="esim. Kylmiö 1 tai Siivous"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Tyyppi</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={newTaskType === 'fridge' ? 'default' : 'outline'}
                    onClick={() => setNewTaskType('fridge')}
                    className={cn(newTaskType === 'fridge' && "copper-gradient")}
                  >
                    Kylmiö
                  </Button>
                  <Button 
                    variant={newTaskType === 'task' ? 'default' : 'outline'}
                    onClick={() => setNewTaskType('task')}
                    className={cn(newTaskType === 'task' && "copper-gradient")}
                  >
                    Tehtävä
                  </Button>
                </div>
              </div>
              <Button onClick={addTask} className="w-full copper-gradient text-white font-bold mt-4">
                <Plus className="w-4 h-4 mr-2" /> Lisää listaan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
