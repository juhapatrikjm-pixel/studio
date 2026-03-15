
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { 
  GraduationCap, 
  CheckCircle2, 
  BookOpen, 
  ShieldAlert, 
  Flame, 
  Wrench, 
  Plus, 
  Trash2, 
  FileCheck,
  UserCheck,
  ChevronRight
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type OnboardingTask = {
  id: string
  title: string
  description: string
  category: 'general' | 'hygiene' | 'safety' | 'tech' | 'quality'
  order: number
}

type OnboardingProgress = {
  id: string
  userId: string
  taskId: string
  completedAt: any
  completedBy: string
}

const CATEGORIES = [
  { id: 'general', label: 'Talon tavat', icon: BookOpen, color: 'text-blue-400' },
  { id: 'hygiene', label: 'Hygienia', icon: ShieldAlert, color: 'text-green-400' },
  { id: 'safety', label: 'Turvallisuus', icon: Flame, color: 'text-orange-400' },
  { id: 'tech', label: 'Laitteet', icon: Wrench, color: 'text-purple-400' },
  { id: 'quality', label: 'Laatu & Reseptit', icon: GraduationCap, color: 'text-accent' },
]

export function OnboardingModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const currentUserId = "demo-user-123" // Oikeassa sovelluksessa useUser()
  const isAdmin = true // Demo-ympäristössä Admin

  // Firestore Refs
  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'onboardingTasks') : null), [firestore])
  const progressRef = useMemo(() => (firestore ? collection(firestore, 'onboardingProgress') : null), [firestore])

  // Queries
  const tasksQuery = useMemo(() => tasksRef ? query(tasksRef, orderBy('order', 'asc')) : null, [tasksRef])
  const userProgressQuery = useMemo(() => progressRef ? query(progressRef, where('userId', '==', currentUserId)) : null, [progressRef, currentUserId])

  const { data: allTasks = [] } = useCollection<OnboardingTask>(tasksQuery)
  const { data: userProgress = [] } = useCollection<OnboardingProgress>(userProgressQuery)

  // Local State
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const [isManaging, setIsManaging] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "", category: 'general' as any })

  // Calculations
  const completedTaskIds = useMemo(() => new Set(userProgress.map(p => p.taskId)), [userProgress])
  
  const stats = useMemo(() => {
    const total = allTasks.length
    const completed = userProgress.length
    const percent = total > 0 ? (completed / total) * 100 : 0
    
    const catStats = CATEGORIES.reduce((acc, cat) => {
      const catTasks = allTasks.filter(t => t.category === cat.id)
      const catCompleted = catTasks.filter(t => completedTaskIds.has(t.id)).length
      acc[cat.id] = {
        total: catTasks.length,
        completed: catCompleted,
        percent: catTasks.length > 0 ? (catCompleted / catTasks.length) * 100 : 0
      }
      return acc
    }, {} as Record<string, { total: number, completed: number, percent: number }>)

    return { total, completed, percent, catStats }
  }, [allTasks, userProgress, completedTaskIds])

  // Handlers
  const toggleTask = (taskId: string) => {
    if (!firestore || !progressRef) return
    
    const progressId = `${currentUserId}_${taskId}`
    const docRef = doc(firestore, 'onboardingProgress', progressId)

    if (completedTaskIds.has(taskId)) {
      deleteDoc(docRef)
    } else {
      setDoc(docRef, {
        id: progressId,
        userId: currentUserId,
        taskId: taskId,
        completedAt: serverTimestamp(),
        completedBy: "John Smith" // Oikeassa sovelluksessa user.name
      })
      toast({
        title: "Tehtävä kuitattu",
        description: "Hyvää työtä! Perehdytys etenee.",
      })
    }
  }

  const addTask = () => {
    if (!newTask.title.trim() || !firestore) return
    const taskId = Math.random().toString(36).substr(2, 9)
    const docRef = doc(firestore, 'onboardingTasks', taskId)
    
    setDoc(docRef, {
      id: taskId,
      ...newTask,
      order: allTasks.length + 1
    })
    setNewTask({ title: "", description: "", category: activeCategory as any })
    toast({ title: "Perehdytystehtävä lisätty" })
  }

  const deleteTask = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'onboardingTasks', id))
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl font-headline font-black copper-text-glow uppercase tracking-tight">Perehdytys & Koulutus</h2>
          </div>
          <p className="text-muted-foreground font-medium italic">Varmista tiimin osaaminen ja työturvallisuus jokaisessa vuorossa.</p>
        </div>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            onClick={() => setIsManaging(!isManaging)}
            className={cn(
              "border-white/10 bg-white/5 transition-all",
              isManaging ? "border-accent text-accent" : "text-muted-foreground hover:text-accent"
            )}
          >
            {isManaging ? "Sulje hallinta" : "Hallitse tehtäviä"}
          </Button>
        )}
      </header>

      {/* Kokonaisedistyminen */}
      <Card className="industrial-card overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Perehdytyksen tila</span>
              <span className="text-2xl font-black text-foreground">{stats.completed} / {stats.total} suoritettu</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-accent">{Math.round(stats.percent)}%</span>
            </div>
          </div>
          <Progress value={stats.percent} className="h-3 bg-white/5 border border-white/5" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Kategorianavigointi */}
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const catStat = stats.catStats[cat.id] || { percent: 0, completed: 0, total: 0 }
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex flex-col p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                    activeCategory === cat.id 
                      ? "bg-primary/20 border-accent/40 shadow-inner" 
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-black/40 border border-white/5 transition-colors",
                        activeCategory === cat.id ? cat.color : "text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn(
                        "text-sm font-black uppercase tracking-widest",
                        activeCategory === cat.id ? "text-accent" : "text-muted-foreground"
                      )}>{cat.label}</span>
                    </div>
                    {catStat.percent === 100 && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 relative z-10">
                    <span className="text-[10px] font-bold text-muted-foreground/60">{catStat.completed}/{catStat.total} Tehtävää</span>
                    <span className="text-[10px] font-black text-foreground">{Math.round(catStat.percent)}%</span>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 h-0.5 bg-accent/20 transition-all" style={{ width: `${catStat.percent}%` }} />
                </button>
              )
            })}
          </div>

          {isManaging && (
            <Card className="industrial-card mt-6">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-accent">Lisää Tehtävä</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase">Tehtävän nimi</Label>
                  <Input 
                    value={newTask.title} 
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Esim. Veitsien hionta..."
                    className="bg-black/40 border-white/10 h-10 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase">Kuvaus</Label>
                  <Input 
                    value={newTask.description} 
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Lyhyt ohjeistus..."
                    className="bg-black/40 border-white/10 h-10 text-xs"
                  />
                </div>
                <Button onClick={addTask} className="w-full copper-gradient text-white font-black text-[10px] uppercase h-10">
                  Tallenna Tehtävä
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tehtävälista */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card min-h-[500px]">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline font-black text-accent uppercase tracking-tight">
                    {CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                    Suorita tehtävät ja varmista osaamistasosi.
                  </CardDescription>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-lg font-black text-accent">
                    {stats.catStats[activeCategory]?.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {allTasks.filter(t => t.category === activeCategory).map((task) => (
                    <div 
                      key={task.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                        completedTaskIds.has(task.id) 
                          ? "bg-green-500/5 border-green-500/20" 
                          : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Checkbox 
                          checked={completedTaskIds.has(task.id)}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="w-6 h-6 border-white/20 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-black transition-all",
                            completedTaskIds.has(task.id) ? "text-muted-foreground/60 line-through" : "text-foreground"
                          )}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[10px] text-muted-foreground italic mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isManaging && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteTask(task.id)}
                          className="text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {allTasks.filter(t => t.category === activeCategory).length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                      <FileCheck className="w-12 h-12 text-muted-foreground" />
                      <p className="text-xs uppercase font-black tracking-widest">Ei määriteltyjä tehtäviä tässä osiossa.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {stats.catStats[activeCategory]?.percent === 100 && (
                <div className="mt-8 p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col items-center text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                    <UserCheck className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-headline font-black text-green-500 uppercase tracking-tight">Osio suoritettu!</h4>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[250px]">Olet hallinnut kaikki tämän kategorian vaatimukset. Hienoa työtä!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
