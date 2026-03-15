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
    date: "",
    month: "",
    revenue: "",
    foodCost: "",
    workHours: "",
    otherExpenses: "",
    comment: ""
  })

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: format(new Date(), 'yyyy-MM-dd'),
      month: format(new Date(), 'yyyy-MM')
    }))
  }, [])

  const currentLaborCost = useMemo(() => {
    const hours = Number(formData.workHours) || 0
    return hours * hourlyRate
  }, [formData.workHours, hourlyRate])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const currentMonthRecords = records.filter(r => {
      try {
        const d = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)
        return isSameMonth(d, now)
      } catch (e) {
        return false
      }
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
      let label = r.date
      try {
        label = r.entryType === 'monthly' ? format(parseISO(r.date + "-01"), 'MMM', { locale: fi }) : format(parseISO(r.date), 'd.M.')
      } catch (e) {}
      
      return {
        pvm: label,
        myynti: r.revenue,
        tulos: profit
      }
    })
  }, [records])

  const handleSave = () => {
    if (!firestore || !recordsRef || !formData.revenue) return
    
    const recordDate = entryType === 'daily' ? formData.date : formData.month
    if (!recordDate) return

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Gem className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Tulos</h2>
        </div>
        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-60">Reaaliaikainen seuranta</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "MYYNTI", val: `${monthlyStats.totals.revenue.toLocaleString('fi-FI')} €`, color: "copper-gradient" },
          { label: "RAAKA-AINE %", val: `${monthlyStats.foodCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "PALKKA %", val: `${monthlyStats.laborCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "KATE", val: `${monthlyStats.profit.toLocaleString('fi-FI')} €`, color: "copper-gradient", highlight: true },
        ].map((kpi, i) => (
          <Card key={i} className="industrial-card group overflow-hidden border-none p-[1px] bg-gradient-to-br from-white/10 to-transparent">
            <div className={cn("absolute top-0 left-0 w-full h-0.5 metal-shine-overlay", kpi.color)} />
            <CardContent className="p-3 bg-card rounded-[calc(var(--radius)-1px)]">
              <p className="text-[8px] uppercase font-black text-muted-foreground/60 tracking-[0.1em] mb-1">{kpi.label}</p>
              <div className={cn(
                "text-sm font-black tabular-nums tracking-tight",
                kpi.highlight ? (monthlyStats.profit >= 0 ? "text-green-500" : "text-destructive") : "text-foreground"
              )}>
                {kpi.val}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-headline font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="w-4 h-4" /> KIRJAUS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Tabs value={entryType} onValueChange={(v: any) => setEntryType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-black/40 border-white/5 p-1 h-9">
                  <TabsTrigger value="daily" className="gap-1 font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent">PÄIVÄ</TabsTrigger>
                  <TabsTrigger value="monthly" className="gap-1 font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-accent">KK</TabsTrigger>
                </TabsList>
                
                <div className="space-y-4">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <Label className="text-[8px] uppercase font-black text-accent/80 tracking-widest">AIKA</Label>
                    <Input 
                      type={entryType === 'daily' ? 'date' : 'month'} 
                      value={entryType === 'daily' ? formData.date : formData.month}
                      onChange={(e) => setFormData({...formData, [entryType === 'daily' ? 'date' : 'month']: e.target.value})}
                      className="bg-transparent border-none p-0 text-sm font-black text-foreground h-7 focus-visible:ring-0"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">MYYNTI (ALV 0%)</Label>
                    <div className="relative group">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.revenue}
                        onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                        className="pl-9 bg-white/5 border-white/10 h-10 text-base font-black rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">RAAKA-AIN. €</Label>
                      <Input type="number" placeholder="€" value={formData.foodCost} onChange={(e) => setFormData({...formData, foodCost: e.target.value})} className="bg-white/5 border-white/10 h-9 text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">TUNNIT (H)</Label>
                      <Input type="number" placeholder="0.0" value={formData.workHours} onChange={(e) => setFormData({...formData, workHours: e.target.value})} className="bg-white/5 border-white/10 h-9 text-xs font-bold" />
                    </div>
                  </div>
                </div>
              </Tabs>

              <Button onClick={handleSave} className="w-full copper-gradient text-white font-black h-10 gap-2 mt-2 uppercase tracking-widest text-[10px]">
                <Save className="w-3.5 h-3.5" /> TALLENNA
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs font-headline font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <BarChart3 className="w-4 h-4" /> KEHITYS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[200px] w-full bg-black/20 rounded-xl p-2 border border-white/5 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="pvm" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 900}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '8px', fontWeight: 'bold' }} />
                    <Bar dataKey="myynti" fill="#b87333" radius={[4, 4, 0, 0]} name="Myynti" barSize={12} />
                    <Bar dataKey="tulos" fill="#71717a" radius={[4, 4, 0, 0]} name="Tulos" barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-[10px] font-headline uppercase tracking-[0.2em] text-muted-foreground font-black flex items-center gap-2">
                <HistoryIcon className="w-3.5 h-3.5" /> HISTORIA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {records.slice(0, 6).map(r => {
                  const { borderColor, statusColor } = getRecordStyle(r)
                  const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
                  let displayDate = r.date
                  try {
                    const recordDate = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)
                    displayDate = r.entryType === 'daily' ? format(recordDate, 'd.M.', { locale: fi }) : format(recordDate, 'MMM yy', { locale: fi }).toUpperCase()
                  } catch (e) {}

                  return (
                    <div key={r.id} className={cn("flex items-center justify-between p-3 rounded-xl bg-white/5 border shadow-inner group", borderColor)}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1 h-8 rounded-full", statusColor)} />
                        <div>
                          <p className="text-[10px] font-black text-foreground">{displayDate}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">{r.revenue.toLocaleString()} €</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn("text-sm font-black tabular-nums", profit >= 0 ? "text-green-500" : "text-destructive")}>
                          {profit > 0 ? "+" : ""}{profit.toLocaleString()}€
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="h-7 w-7 text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
