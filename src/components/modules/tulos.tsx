"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  CheckCircle2,
  Gem
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
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
    
    let borderColor = "border-white/5"
    let statusColor = "bg-amber-500"
    let animateClass = ""

    if (margin > 20) {
      borderColor = "border-green-500/30"
      statusColor = "bg-green-500"
      if (margin > 35) animateClass = "animate-breathing"
    } else if (margin < 5) {
      borderColor = "border-destructive/30"
      statusColor = "bg-destructive"
      if (margin < 0) animateClass = "animate-breathing"
    }

    return { borderColor, statusColor, animateClass }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Gem className="w-8 h-8 text-accent" />
          <h2 className="text-4xl font-headline font-black copper-text-glow">Tulos & Seuranta</h2>
        </div>
        <p className="text-muted-foreground font-medium">Reaaliaikainen kannattavuus ja taloushallinta.</p>
      </header>

      {/* KPI Kortit - Metalliset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "MYYNTI (KK)", val: `${monthlyStats.totals.revenue.toLocaleString('fi-FI')} €`, color: "copper-gradient" },
          { label: "RAAKA-AINEET %", val: `${monthlyStats.foodCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "PALKAT %", val: `${monthlyStats.laborCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "KATE-EUROUT", val: `${monthlyStats.profit.toLocaleString('fi-FI')} €`, color: "copper-gradient", highlight: true },
        ].map((kpi, i) => (
          <Card key={i} className="industrial-card group overflow-hidden border-none p-[1px] bg-gradient-to-br from-white/10 to-transparent">
            <div className={cn("absolute top-0 left-0 w-full h-1 metal-shine-overlay", kpi.color)} />
            <CardContent className="p-6 bg-card rounded-[calc(var(--radius)-1px)]">
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-[0.2em] mb-2">{kpi.label}</p>
              <div className={cn(
                "text-2xl font-black tabular-nums tracking-tight",
                kpi.highlight ? (monthlyStats.profit >= 0 ? "text-green-500" : "text-destructive") : "text-foreground"
              )}>
                {kpi.val}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Syöttö-osio */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            <CardHeader>
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <Calculator className="w-6 h-6" /> Kirjaa Tulokset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={entryType} onValueChange={(v: any) => setEntryType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border-white/5 p-1 h-12">
                  <TabsTrigger value="daily" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent">
                    <CalendarDays className="w-3.5 h-3.5" /> PÄIVÄ
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent">
                    <CalendarRange className="w-3.5 h-3.5" /> KK
                  </TabsTrigger>
                </TabsList>
                
                <div className="space-y-5">
                  <div className="p-5 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                    {entryType === 'daily' ? (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-accent/80 tracking-widest">PÄIVÄMÄÄRÄ</Label>
                        <Input 
                          type="date" 
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className="bg-transparent border-none p-0 text-lg font-black text-foreground h-auto focus-visible:ring-0"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-accent/80 tracking-widest">KUUKAUSI</Label>
                        <Input 
                          type="month" 
                          value={formData.month}
                          onChange={(e) => setFormData({...formData, month: e.target.value})}
                          className="bg-transparent border-none p-0 text-lg font-black text-foreground h-auto focus-visible:ring-0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">MYYNTI (ALV 0%)</Label>
                    <div className="relative group">
                      <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.revenue}
                        onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                        className="pl-12 bg-white/5 border-white/10 h-14 text-xl font-black rounded-xl focus:border-accent/40 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">RAAKA-AINEET</Label>
                      <Input 
                        type="number" 
                        placeholder="€"
                        value={formData.foodCost}
                        onChange={(e) => setFormData({...formData, foodCost: e.target.value})}
                        className="bg-white/5 border-white/10 h-12 font-bold rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">TUNNIT (H)</Label>
                      <Input 
                        type="number" 
                        placeholder="0.0"
                        value={formData.workHours}
                        onChange={(e) => setFormData({...formData, workHours: e.target.value})}
                        className="bg-white/5 border-white/10 h-12 font-bold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">MUUT KULUT</Label>
                    <Input 
                      type="number" 
                      placeholder="Esim. vuokra, sähkö..."
                      value={formData.otherExpenses}
                      onChange={(e) => setFormData({...formData, otherExpenses: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 font-bold rounded-xl"
                    />
                  </div>
                </div>
              </Tabs>

              <Button onClick={handleSave} className="w-full copper-gradient text-white font-black h-14 gap-3 mt-6 shadow-2xl metal-shine-overlay uppercase tracking-widest text-xs">
                <Save className="w-5 h-5" /> TALLENNA TIEDOT
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historia ja Visualisointi */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="industrial-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-headline font-black text-accent flex items-center gap-3">
                <BarChart3 className="w-6 h-6" /> Kehityskäyrä
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-6 bg-black/20 rounded-2xl p-6 border border-white/5 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="pvm" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900}} 
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.03)'}}
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="myynti" fill="#b87333" radius={[6, 6, 0, 0]} name="Myynti" barSize={20} />
                    <Bar dataKey="tulos" fill="#71717a" radius={[6, 6, 0, 0]} name="Tulos" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-sm font-headline uppercase tracking-[0.3em] text-muted-foreground font-black flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" /> Historia
              </CardTitle>
              <Badge variant="outline" className="text-[9px] uppercase font-black opacity-40">Viimeiset 10 kirjausta</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {records.slice(0, 10).map(r => {
                  const { borderColor, statusColor, animateClass } = getRecordStyle(r)
                  const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
                  const recordDate = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)

                  return (
                    <div 
                      key={r.id} 
                      className={cn(
                        "flex items-center justify-between p-5 rounded-2xl bg-white/5 border shadow-inner group transition-all duration-700",
                        borderColor,
                        animateClass
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("w-1.5 h-12 rounded-full shadow-lg", statusColor)} />
                        <div>
                          <p className="text-sm font-black text-foreground">
                            {r.entryType === 'daily' 
                              ? format(recordDate, 'EEEE d.M.', { locale: fi }) 
                              : format(recordDate, 'MMMM yyyy', { locale: fi }).toUpperCase()
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{r.revenue.toLocaleString()} €</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{r.workHours || 0}H</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-black tabular-nums drop-shadow-md",
                            profit >= 0 ? "text-green-500" : "text-destructive"
                          )}>
                            {profit > 0 ? "+" : ""}{profit.toLocaleString()}€
                          </div>
                          <p className="text-[8px] uppercase font-black text-muted-foreground tracking-[0.2em]">KATE</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteRecord(r.id)} 
                          className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {records.length === 0 && (
                  <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-30">
                    <HistoryIcon className="w-12 h-12 text-muted-foreground" />
                    <p className="text-xs uppercase font-black tracking-widest">Ei aiempia merkintöjä</p>
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
