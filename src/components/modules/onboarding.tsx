"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Save,
  RefreshCw,
  MessageSquare,
  Loader2
} from "lucide-react"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp, where, writeBatch, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, getDocs } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type OnboardingTask = {
  id: string
  title: string
  description: string
  category: string
  order: number
}

const onboardingTaskConverter: FirestoreDataConverter<OnboardingTask> = {
  toFirestore: (task: OnboardingTask): DocumentData => {
    const { id, ...data } = task;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options): OnboardingTask => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      title: data.title,
      description: data.description,
      category: data.category,
      order: data.order
    };
  }
};

type CategoryMeta = {
  goal: string
  masterQuestion: string
}

const categoryMetaConverter: FirestoreDataConverter<CategoryMeta> = {
  toFirestore: (meta: CategoryMeta): DocumentData => {
    return { goal: meta.goal, masterQuestion: meta.masterQuestion };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options): CategoryMeta => {
    const data = snapshot.data(options)!;
    return {
      goal: data.goal,
      masterQuestion: data.masterQuestion
    };
  }
};

const CATEGORIES = [
  { id: 'general', label: 'Talon tavat', icon: BookOpen, color: 'text-blue-400' },
  { id: 'hygiene', label: 'Hygienia', icon: ShieldAlert, color: 'text-green-400' },
  { id: 'safety', label: 'Turvallisuus', icon: Flame, color: 'text-orange-400' },
  { id: 'tech', label: 'Laitteet', icon: Wrench, color: 'text-purple-400' },
  { id: 'quality', label: 'Laatu & Reseptit', icon: GraduationCap, color: 'text-accent' },
]

const DEFAULT_DATA: Record<string, { goal: string, masterQuestion: string, tasks: string[] }> = {
  general: {
    goal: "Perehdytettävä ymmärtää, miten tiimi toimii ja missä tavarat ovat.",
    masterQuestion: "Jos huomaat, että maito on loppumassa ja seuraava kuorma tulee vasta ylihuomenna, mikä on meidän toimintatapamme?",
    tasks: ["Työajat ja leimat", "Pukukoodi ja olemus", "Tavaran vastaanotto", "Viestintäkanavat", "Henkilökuntaravinto"]
  },
  hygiene: {
    goal: "Taata asiakasturvallisuus ja noudattaa lakisääteisiä vaatimuksia.",
    masterQuestion: "Miten toimit, jos huomaat aamulla, että kylmiön ovi on jäänyt raolleen ja lämpötila on noussut +12 asteeseen?",
    tasks: ["Käsihygienia", "Lämpötilaseuranta", "Ristikontaminaatio", "Siivoussuunnitelma", "Pintapuhtausnäytteet"]
  },
  safety: {
    goal: "Ehkäistä tapaturmat ja tietää, miten toimia kriisitilanteessa.",
    masterQuestion: "Tiedätkö, missä on lähin sammutuspeite ja kuka on keittiön ensiapuvastaava?",
    tasks: ["Ensiapupiste", "Paloturvallisuus", "Kemikaaliturvallisuus", "Veitsitekniikka & Ergonomia", "Liukastumisten esto"]
  },
  tech: {
    goal: "Laitteiden pitkäikäisyyden varmistaminen ja käyttöturvallisuus.",
    masterQuestion: "Näytätkö, miten tämä uuni pestään turvallisesti vuoron päätteeksi?",
    tasks: ["Uunit ja liedet", "Astianpesukone", "Kylmälaitteet", "Pienkoneet", "Vikailmoitukset"]
  },
  quality: {
    goal: "Tasalaatuisuuden varmistaminen ja kannattavuuden ymmärtäminen.",
    masterQuestion: "Jos reseptissä lukee 150g proteiinia, mutta laitat huolimattomuuttasi 180g, mitä se tarkoittaa ravintolan kannattavuudelle pitkässä juoksussa?",
    tasks: ["Reseptiikan käyttö", "Annoskatelaskenta", "Hävikin hallinta", "Esillepano", "Makuprofiili"]
  }
}

export function OnboardingModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const currentUserId = user?.uid || "guest"
  const isAdmin = true // Testivaiheessa aina Admin

  // Firestore Refs
  const tasksRef = useMemo(() => (firestore ? collection(firestore, 'onboardingTasks').withConverter(onboardingTaskConverter) : null), [firestore])
  const progressRef = useMemo(() => (firestore ? collection(firestore, 'onboardingProgress') : null), [firestore])
  const metaRef = useMemo(() => (firestore ? collection(firestore, 'onboardingMeta').withConverter(categoryMetaConverter) : null), [firestore])

  // Queries
  const tasksQuery = useMemo(() => tasksRef ? query(tasksRef, orderBy('order', 'asc')) : null, [tasksRef])
  const userProgressQuery = useMemo(() => progressRef ? query(progressRef, where('userId', '==', currentUserId)) : null, [progressRef, currentUserId])

  const { data: allTasks = [] } = useCollection<OnboardingTask>(tasksQuery)
  const { data: userProgress = [] } = useCollection<any>(userProgressQuery)

  // Local State
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const [isManaging, setIsManaging] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", description: "" })

  const categoryMetaRef = useMemo(() => (firestore ? doc(firestore, 'onboardingMeta', activeCategory).withConverter(categoryMetaConverter) : null), [firestore, activeCategory])
  const { data: currentMeta } = useDoc<CategoryMeta>(categoryMetaRef)

  const [localQuestion, setLocalQuestion] = useState("")
  const [localGoal, setLocalGoal] = useState("")

  useEffect(() => {
    if (currentMeta) {
      setLocalQuestion(currentMeta.masterQuestion || "")
      setLocalGoal(currentMeta.goal || "")
    } else if (DEFAULT_DATA[activeCategory]) {
      setLocalQuestion(DEFAULT_DATA[activeCategory].masterQuestion)
      setLocalGoal(DEFAULT_DATA[activeCategory].goal)
    }
  }, [currentMeta, activeCategory])

  // Calculations
  const completedTaskIds = useMemo(() => new Set(userProgress.map(p => p.taskId)), [userProgress])
  
  const stats = useMemo(() => {
    const total = allTasks.length
    const completed = completedTaskIds.size
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
  }, [allTasks, completedTaskIds])

  // Handlers
  const toggleTask = (taskId: string) => {
    if (!firestore || !progressRef) return
    const progressId = `${currentUserId}_${taskId}`
    const docRef = doc(firestore, 'onboardingProgress', progressId)

    if (completedTaskIds.has(taskId)) {
      deleteDoc(docRef).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
      });
    } else {
      const data = {
        id: progressId,
        userId: currentUserId,
        taskId: taskId,
        completedAt: serverTimestamp(),
        completedBy: user?.displayName || "Käyttäjä"
      };
      setDoc(docRef, data).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'create',
          requestResourceData: data
        }));
      });
      toast({ title: "Tehtävä kuitattu" })
    }
  }

  const seedDefaults = async () => {
    if (!firestore || !tasksRef || !metaRef) return
    setIsSeeding(true)
    try {
      const batch = writeBatch(firestore)
      const currentTasks = await getDocs(tasksRef);
      currentTasks.forEach(t => batch.delete(t.ref))
      const currentMeta = await getDocs(metaRef);
      currentMeta.forEach(m => batch.delete(m.ref));


      for (const [catId, data] of Object.entries(DEFAULT_DATA)) {
        for (const [i, title] of data.tasks.entries()) {
          const taskDocRef = doc(tasksRef);
          batch.set(taskDocRef, {
            id: taskDocRef.id,
            title,
            description: "",
            category: catId,
            order: i
          })
        }
        const metaDocRef = doc(metaRef, catId);
        batch.set(metaDocRef, {
          goal: data.goal,
          masterQuestion: data.masterQuestion
        })
      }

      await batch.commit()
      toast({ title: "Oletuspohja ladattu" })
    } catch (e) {
      console.error("Seeding error: ", e);
      toast({ variant: "destructive", title: "Virhe latauksessa" })
    } finally {
      setIsSeeding(false)
    }
  }

  const saveMeta = () => {
    if (!categoryMetaRef) return
    setDoc(categoryMetaRef, { 
      masterQuestion: localQuestion,
      goal: localGoal
    }, { merge: true }).then(() => toast({ title: "Kategorian tiedot tallennettu" })).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: categoryMetaRef.path,
        operation: 'update',
        requestResourceData: { masterQuestion: localQuestion, goal: localGoal }
      }));
    });
  }

  const addTask = () => {
    if (!newTask.title.trim() || !tasksRef) return
    const taskDocRef = doc(tasksRef);
    const taskData: OnboardingTask = {
      id: taskDocRef.id,
      title: newTask.title,
      description: newTask.description,
      category: activeCategory,
      order: allTasks.length
    };
    setDoc(taskDocRef, taskData).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskDocRef.path,
        operation: 'create',
        requestResourceData: taskData
      }));
    });
    setNewTask({ title: "", description: "" })
  }

  const updateTaskTitle = (taskId: string, newTitle: string) => {
    if (!tasksRef) return
    setDoc(doc(tasksRef, taskId), { title: newTitle }, { merge: true }).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `onboardingTasks/${taskId}`,
        operation: 'update',
        requestResourceData: { title: newTitle }
      }));
    });
  }

  const deleteTask = (id: string) => {
    if (!tasksRef) return
    const docRef = doc(tasksRef, id);
    deleteDoc(docRef).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
    });
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl copper-gradient flex items-center justify-center shadow-lg metal-shine-overlay">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl font-headline font-black copper-text-glow uppercase tracking-tight">Perehdytys</h2>
          </div>
          <p className="text-muted-foreground font-medium italic">Varmista tiimin osaaminen ja työturvallisuus jokaisessa vuorossa.</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={isSeeding} className="border-accent/40 text-accent hover:bg-accent/5">
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              LATAA OLETUSPOHJA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsManaging(!isManaging)} className={cn(isManaging ? "border-accent text-accent" : "border-white/10")}>
              {isManaging ? "SULJE HALLINTA" : "HALLITSE"}
            </Button>
          </div>
        )}
      </header>

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
                    activeCategory === cat.id ? "bg-primary/20 border-accent/40 shadow-inner" : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-black/40 border border-white/5", activeCategory === cat.id ? cat.color : "text-muted-foreground")}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn("text-sm font-black uppercase tracking-widest", activeCategory === cat.id ? "text-accent" : "text-muted-foreground")}>{cat.label}</span>
                    </div>
                    {catStat.percent === 100 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
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
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-black uppercase text-accent">LISÄÄ TEHTÄVÄ</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase">Uusi tehtävä</Label>
                  <Input value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="bg-black/40 border-white/10 h-10 text-xs" />
                </div>
                <Button onClick={addTask} className="w-full copper-gradient text-white font-black text-[10px] uppercase h-10">LISÄÄ LISTAAN</Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card min-h-[500px] flex flex-col">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <CardTitle className="text-xl font-headline font-black text-accent uppercase">{CATEGORIES.find(c => c.id === activeCategory)?.label}</CardTitle>
                  {isManaging ? (
                    <div className="mt-2 space-y-1">
                      <Label className="text-[8px] uppercase font-bold text-accent/60">Kategorian tavoite</Label>
                      <Input 
                        value={localGoal} 
                        onChange={(e) => setLocalGoal(e.target.value)} 
                        className="h-8 bg-black/40 border-white/10 text-[10px] font-bold"
                      />
                    </div>
                  ) : (
                    <CardDescription className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest italic">
                      Tavoite: {localGoal}
                    </CardDescription>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 h-fit">
                  <span className="text-lg font-black text-accent">{stats.catStats[activeCategory]?.percent.toFixed(0)}%</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 flex-1 flex flex-col gap-6">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {allTasks.filter(t => t.category === activeCategory).map((task) => (
                    <div key={task.id} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all group", completedTaskIds.has(task.id) ? "bg-green-500/5 border-green-500/20" : "bg-white/5 border-white/5 hover:border-white/10")}>
                      <div className="flex items-center gap-4 flex-1">
                        <Checkbox checked={completedTaskIds.has(task.id)} onCheckedChange={() => toggleTask(task.id)} className="w-6 h-6 border-white/20 data-[state=checked]:bg-green-500" />
                        {isManaging ? (
                          <Input 
                            defaultValue={task.title} 
                            onBlur={(e) => updateTaskTitle(task.id, e.target.value)}
                            className="bg-transparent border-none p-0 text-sm font-black uppercase tracking-tight focus-visible:ring-0"
                          />
                        ) : (
                          <span className={cn("text-sm font-black uppercase tracking-tight", completedTaskIds.has(task.id) ? "text-muted-foreground/60 line-through" : "text-foreground")}>{task.title}</span>
                        )}
                      </div>
                      {isManaging && <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-destructive/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  ))}\
                </div>
              </ScrollArea>

              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="bg-accent/5 p-4 rounded-2xl border border-accent/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.2em] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Mestarin kysymys
                    </h4>
                    {isAdmin && isManaging && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-accent hover:bg-accent/10" onClick={saveMeta}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {isManaging ? (
                    <Textarea 
                      value={localQuestion} 
                      onChange={(e) => setLocalQuestion(e.target.value)}
                      className="bg-black/40 border-white/10 min-h-[80px] text-sm font-bold text-foreground italic leading-relaxed"
                      placeholder="Kirjoita kysymys tähän..."
                    />
                  ) : (
                    <p className="text-sm font-bold text-foreground leading-relaxed italic whitespace-pre-wrap">"{localQuestion}"</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
