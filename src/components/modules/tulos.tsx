
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  Euro, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Save, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  PieChart,
  Clock,
  CalendarDays,
  CalendarRange,
  History as HistoryIcon,
  CheckCircle2
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

type FinancialRecord = {
  id: string
  date: string
  revenue: number
  foodCost: number
  laborCost: number
  workHours: number
  otherExpenses: number
  comment?: string
  entryType: 'daily' | 'monthly'
  createdAt: any
}

export function TulosModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const recordsRef = useMemo(() => (firestore ? collection(firestore, 'financialRecords') : null), [firestore])
  const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore])
  
  const recordsQuery = useMemo(() => {
    if (!recordsRef) return null
    return query(recordsRef, orderBy('date', 'desc'), limit(100))
  }, [recordsRef])
  
  const { data: records = [] } = useCollection<FinancialRecord>(recordsQuery)
  const { data: settings } = useDoc<any>(settingsRef)

  const hourlyRate = settings?.hourlyRate || 22

  const [entryType, setEntryType] = useState<'daily' | 'monthly'>('daily')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    month: format(new Date(), 'yyyy-MM'),
    revenue: "",
    foodCost: "",
    workHours: "",
    otherExpenses: "",
    comment: ""
  })

  const currentLaborCost = useMemo(() => {
    const hours = Number(formData.workHours) || 0
    return hours * hourlyRate
  }, [formData.workHours, hourlyRate])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const currentMonthRecords = records.filter(r => {
      const d = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)
      return isSameMonth(d, now)
    })
    
    const totals = currentMonthRecords.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.revenue || 0),
      foodCost: acc.foodCost + (curr.foodCost || 0),
      laborCost: acc.laborCost + (curr.laborCost || 0),
      workHours: acc.workHours + (curr.workHours || 0),
      otherExpenses: acc.otherExpenses + (curr.otherExpenses || 0),
    }), { revenue: 0, foodCost: 0, laborCost: 0, workHours: 0, otherExpenses: 0 })

    const profit = totals.revenue - totals.foodCost - totals.laborCost - totals.otherExpenses
    const foodCostPerc = totals.revenue > 0 ? (totals.foodCost / totals.revenue) * 100 : 0
    const laborCostPerc = totals.revenue > 0 ? (totals.laborCost / totals.revenue) * 100 : 0
    const marginPerc = totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0

    return { totals, profit, foodCostPerc, laborCostPerc, marginPerc, count: currentMonthRecords.length }
  }, [records])

  const chartData = useMemo(() => {
    return records.slice(0, 10).reverse().map(r => {
      const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
      return {
        pvm: r.entryType === 'monthly' ? format(parseISO(r.date + "-01"), 'MMM', { locale: fi }) : format(parseISO(r.date), 'd.M.'),
        myynti: r.revenue,
        tulos: profit
      }
    })
  }, [records])

  const handleSave = () => {
    if (!firestore || !recordsRef || !formData.revenue) return
    
    const recordDate = entryType === 'daily' ? formData.date : formData.month
    const id = recordDate
    const docRef = doc(firestore, 'financialRecords', id)
    
    const laborCost = Number(formData.workHours) * hourlyRate

    const dataToSave = {
      id,
      date: recordDate,
      entryType,
      revenue: Number(formData.revenue),
      foodCost: Number(formData.foodCost) || 0,
      workHours: Number(formData.workHours) || 0,
      laborCost: laborCost,
      otherExpenses: Number(formData.otherExpenses) || 0,
      comment: formData.comment,
      createdAt: serverTimestamp()
    }

    setDoc(docRef, dataToSave, { merge: true })
      .then(() => {
        toast({
          title: "Tiedot tallennettu",
          description: `${entryType === 'daily' ? 'Päivän' : 'Kuukauden'} luvut tallennettu onnistuneesti.`,
        })
        // Nollataan vain luvut, pidetään päivämäärä/kuukausi samana jos haluaa täyttää lisää
        setFormData(prev => ({
          ...prev,
          revenue: "",
          foodCost: "",
          workHours: "",
          otherExpenses: "",
          comment: ""
        }))
      })
  }

  const deleteRecord = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'financialRecords', id))
  }

  const getRecordStyle = (r: FinancialRecord) => {
    const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
    const margin = r.revenue > 0 ? (profit / r.revenue) * 100 : 0
    
    let borderColor = "border-border"
    let animateClass = ""

    if (margin > 20) {
      borderColor = "border-green-500/50"
      if (margin > 35) animateClass = "animate-breathing"
    } else if (margin < 5) {
      borderColor = "border-destructive/50"
      if (margin < 0) animateClass = "animate-breathing"
    } else {
      borderColor = "border-amber-500/50"
    }

    return { borderColor, animateClass }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Tulos & Seuranta</h2>
        <p className="text-muted-foreground">Seuraa ravintolasi taloutta ja kannattavuutta. Voit täyttää tietoja myös takautuvasti.</p>
      </header>

      {/* KPI Kortit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Myynti (KK)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold">{monthlyStats.totals.revenue.toLocaleString('fi-FI')} €</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Raaka-aineet %</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold">{monthlyStats.foodCostPerc.toFixed(1)} %</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Palkat %</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold">{monthlyStats.laborCostPerc.toFixed(1)} %</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Kate-eurot</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className={cn("text-xl font-bold", monthlyStats.profit >= 0 ? "text-green-500" : "text-destructive")}>
              {monthlyStats.profit.toLocaleString('fi-FI')} €
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Syöttö-osio */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent" />
                Kirjaa luvut
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Valitse päivämäärä täyttääksesi takautuvasti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={entryType} onValueChange={(v: any) => setEntryType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="daily" className="gap-2">
                    <CalendarDays className="w-3.5 h-3.5" /> Päivä
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="gap-2">
                    <CalendarRange className="w-3.5 h-3.5" /> Kuukausi
                  </TabsTrigger>
                </TabsList>
                
                <div className="space-y-4">
                  <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                    {entryType === 'daily' ? (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-accent flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3" /> Valitse päivä
                        </Label>
                        <Input 
                          type="date" 
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className="bg-background border-border font-bold text-accent"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-accent flex items-center gap-2">
                          <CalendarRange className="w-3 h-3" /> Valitse kuukausi
                        </Label>
                        <Input 
                          type="month" 
                          value={formData.month}
                          onChange={(e) => setFormData({...formData, month: e.target.value})}
                          className="bg-background border-border font-bold text-accent"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Myynti (ALV 0%)</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.revenue}
                        onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                        className="pl-10 bg-muted/30 border-border font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Raaka-ainekulut</Label>
                      <Input 
                        type="number" 
                        placeholder="€"
                        value={formData.foodCost}
                        onChange={(e) => setFormData({...formData, foodCost: e.target.value})}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Työtunnit (h)</Label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                          type="number" 
                          placeholder="0.0"
                          value={formData.workHours}
                          onChange={(e) => setFormData({...formData, workHours: e.target.value})}
                          className="pl-8 bg-muted/30 border-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Muut kulut</Label>
                    <Input 
                      type="number" 
                      placeholder="Muut kiinteät kulut"
                      value={formData.otherExpenses}
                      onChange={(e) => setFormData({...formData, otherExpenses: e.target.value})}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                </div>
              </Tabs>

              <Button onClick={handleSave} className="w-full copper-gradient text-white font-bold h-12 gap-2 mt-4 shadow-lg">
                <Save className="w-5 h-5" /> Tallenna {entryType === 'daily' ? 'päivä' : 'kuukausi'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Kaavio ja Historia */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  Kehitys
                </CardTitle>
                <CardDescription className="text-xs">Viimeisimmät kirjaukset (myynti vs tulos)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="pvm" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="myynti" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Myynti" />
                    <Bar dataKey="tulos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tulos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4" /> Historia
                </CardTitle>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Viimeisimmät 8 merkintää</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {records.slice(0, 8).map(r => {
                  const { borderColor, animateClass } = getRecordStyle(r)
                  const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
                  const recordDate = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)

                  return (
                    <div 
                      key={r.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border bg-white/5 group transition-all duration-500",
                        borderColor,
                        animateClass
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-accent">
                            {r.entryType === 'daily' 
                              ? format(recordDate, 'EEEE d.M.', { locale: fi }) 
                              : format(recordDate, 'MMMM yyyy', { locale: fi }).toUpperCase()
                            }
                          </span>
                          <div className="flex gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase">{r.revenue.toLocaleString()} € myynti</span>
                            <span className="text-[10px] text-muted-foreground/60 uppercase">({r.workHours || 0} h)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn(
                            "text-sm font-bold",
                            profit >= 0 ? "text-green-500" : "text-destructive"
                          )}>
                            {profit.toLocaleString()} €
                          </div>
                          <div className="text-[9px] text-muted-foreground uppercase font-bold">Puhdas kate</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {records.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground italic text-xs">Ei tallennettuja lukuja.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
