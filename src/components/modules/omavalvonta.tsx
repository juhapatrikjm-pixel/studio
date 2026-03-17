"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShieldCheck, Plus, Trash2, Thermometer, ClipboardCheck, Zap, User, Bluetooth, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { MonitoringPulse } from "../monitoring-pulse"
import * as monitoringService from "@/services/monitoring-service"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fi } from "date-fns/locale"

type SMTask = {
  id: string
  name: string
  type: 'fridge' | 'task'
}

export function OmavalvontaModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)
  const currentUserName = profile?.userName || user?.displayName || "Käyttäjä"

  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'selfMonitoringTasks') : null), [firestore])
  const { data: tasks = [] } = useCollection<SMTask>(tasksRef)
  
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isBluetoothLoading, setIsBluetoothLoading] = useState(false)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskType, setNewTaskType] = useState<'fridge' | 'task'>('fridge')

  const handleComplete = async () => {
    if (!firestore || !user) return
    setIsSaving(true)
    try {
      await monitoringService.saveMonitoringRecord(firestore, {
        recordedBy: currentUserName,
        values: currentValues,
        method: 'manual'
      })
      toast({ title: "Kirjaus tallennettu", description: "Hälytys on kuitattu automaattisesti." })
      setCurrentValues({})
    } catch (e) {
      toast({ variant: "destructive", title: "Virhe tallennuksessa" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBluetooth = async () => {
    setIsBluetoothLoading(true)
    try {
      const result: any = await monitoringService.handleBluetoothMeasurement()
      toast({ title: "Bluetooth-mittaus valmis", description: `Saatu arvo: ${result}°C` })
      // Tässä voisi automaattisesti täyttää valitun kylmiön arvon
    } finally {
      setIsBluetoothLoading(false)
    }
  }

  const handleChefAudit = async () => {
    if (!firestore || !user) return
    try {
      await monitoringService.acknowledgeMonitoring(firestore, user.uid, currentUserName, 'chef_audit')
      toast({ title: "Auditointi tallennettu", description: "Viikon tiedot merkitty tarkistetuiksi." })
    } catch (e) {
      console.error(e)
    }
  }

  const addTask = async () => {
    if (!newTaskName.trim() || !firestore) return
    const id = Math.random().toString(36).substr(2, 9)
    await setDoc(doc(firestore, 'selfMonitoringTasks', id), {
      id,
      name: newTaskName,
      type: newTaskType,
    })
    setNewTaskName("")
  }

  const removeTask = async (id: string) => {
    if (!firestore) return
    await deleteDoc(doc(firestore, 'selfMonitoringTasks', id))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent uppercase tracking-tighter">Omavalvonta</h2>
        <p className="text-muted-foreground font-medium italic">Päivittäiset lämpötilat ja keittiöhygienia.</p>
      </header>

      <MonitoringPulse />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-black/20">
              <div>
                <CardTitle className="font-headline text-lg">Päivän kirjaukset</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                  {format(new Date(), 'EEEE d. MMMM', { locale: fi })}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBluetooth}
                disabled={isBluetoothLoading}
                className="border-accent/40 text-accent hover:bg-accent/5 font-black text-[10px] uppercase h-9 gap-2"
              >
                {isBluetoothLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                MITTAA BLUETOOTHILLA
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">KIRJAAJA</p>
                  <p className="text-sm font-black text-foreground uppercase">{currentUserName}</p>
                </div>
              </div>

              {tasks.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Ei määriteltyjä tehtäviä. Lisää kohteita oikealta.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 rounded-2xl border border-white/5 bg-white/5 hover:border-accent/20 transition-all group relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-accent">
                          {task.type === 'fridge' ? <Thermometer className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight">{task.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Input 
                      placeholder={task.type === 'fridge' ? "Lämpötila °C" : "Kuittaus / Huomio"}
                      value={currentValues[task.id] || ""}
                      onChange={(e) => setCurrentValues(prev => ({ ...prev, [task.id]: e.target.value }))}
                      className="h-10 bg-black/40 border-white/10 text-sm font-bold placeholder:font-normal"
                    />
                  </div>
                ))}
              </div>

              {tasks.length > 0 && (
                <Button 
                  onClick={handleComplete} 
                  disabled={isSaving || Object.keys(currentValues).length === 0}
                  className="w-full h-14 copper-gradient text-white font-black text-sm rounded-2xl shadow-xl uppercase tracking-widest gap-3 metal-shine-overlay mt-4"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                  TALLENNA JA KUITTAA PÄIVÄ
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Keittiömestarin auditointi */}
          <Card className="industrial-card border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Keittiömestarin tarkistus
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed max-w-md">
                Vastuuhenkilön on tarkistettava omavalvonnan toteutuminen säännöllisesti. Tämä kuittaus merkitsee jakson tiedot validoiduiksi.
              </p>
              <Button 
                onClick={handleChefAudit}
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/10 font-black text-[10px] uppercase h-10 px-6 shrink-0"
              >
                KUITATTU TARKISTETUKSI
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="industrial-card">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-accent">Lisää uusi kohde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Kohteen nimi</Label>
                <Input 
                  placeholder="esim. Kylmiö 1 tai Siivous"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Tyyppi</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={newTaskType === 'fridge' ? 'default' : 'outline'}
                    onClick={() => setNewTaskType('fridge')}
                    className={cn("h-10 text-[10px] font-black uppercase", newTaskType === 'fridge' && "copper-gradient text-white")}
                  >
                    Kylmiö
                  </Button>
                  <Button 
                    variant={newTaskType === 'task' ? 'default' : 'outline'}
                    onClick={() => setNewTaskType('task')}
                    className={cn("h-10 text-[10px] font-black uppercase", newTaskType === 'task' && "copper-gradient text-white")}
                  >
                    Tehtävä
                  </Button>
                </div>
              </div>
              <Button onClick={addTask} className="w-full steel-detail text-background font-black text-[10px] uppercase h-11 mt-4">
                <Plus className="w-4 h-4 mr-2" /> Lisää listaan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
