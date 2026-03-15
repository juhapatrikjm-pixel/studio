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
  Save, 
  Trash2, 
  Calculator, 
  History as HistoryIcon,
  Gem
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { format, isSameMonth, parseISO } from "date-fns"
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

    return { totals, profit, foodCostPerc, laborCostPerc }
  }, [records])

  const chartData = useMemo(() => {
    return records.slice(0, 10).reverse().map(r => {
      const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
      let label = r.date
      try {
        label = r.entryType === 'monthly' ? format(parseISO(r.date + "-01"), 'MMM', { locale: fi }) : format(parseISO(r.date), 'd.M.')
      } catch (e) {}
      return { pvm: label, myynti: r.revenue, tulos: profit }
    })
  }, [records])

  const handleSave = () => {
    if (!firestore || !recordsRef || !formData.revenue) return
    const recordDate = entryType === 'daily' ? formData.date : formData.month
    if (!recordDate) return
    const docRef = doc(firestore, 'financialRecords', recordDate)
    const laborCost = Number(formData.workHours) * hourlyRate
    const dataToSave = {
      id: recordDate,
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
    setDoc(docRef, dataToSave, { merge: true }).then(() => {
      toast({ title: "Tiedot tallennettu" })
      setFormData(prev => ({ ...prev, revenue: "", foodCost: "", workHours: "", otherExpenses: "", comment: "" }))
    })
  }

  const deleteRecord = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'financialRecords', id))
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-headline font-black copper-text-glow uppercase tracking-tighter">Tulos</h2>
        </div>
        <span className="text-muted-foreground text-[8px] font-black uppercase tracking-widest opacity-40">Live Analysis</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "MYYNTI", val: `${monthlyStats.totals.revenue.toLocaleString('fi-FI')} €`, color: "copper-gradient" },
          { label: "RAAKA-AINE %", val: `${monthlyStats.foodCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "PALKKA %", val: `${monthlyStats.laborCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "KATE", val: `${monthlyStats.profit.toLocaleString('fi-FI')} €`, color: "copper-gradient", highlight: true },
        ].map((kpi, i) => (
          <Card key={i} className="industrial-card overflow-hidden border-none p-[1px] bg-gradient-to-br from-white/10 to-transparent">
            <div className={cn("absolute top-0 left-0 w-full h-0.5", kpi.color)} />
            <CardContent className="p-2.5 bg-card rounded-[calc(var(--radius)-1px)] text-center">
              <p className="text-[7px] uppercase font-black text-muted-foreground/60 tracking-widest mb-0.5">{kpi.label}</p>
              <div className={cn(
                "text-xs font-black tabular-nums",
                kpi.highlight ? (monthlyStats.profit >= 0 ? "text-green-500" : "text-destructive") : "text-foreground"
              )}>{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4">
          <Card className="industrial-card">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[9px] font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="w-3 h-3" /> KIRJAUS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <Tabs value={entryType} onValueChange={(v: any) => setEntryType(v)}>
                <TabsList className="grid w-full grid-cols-2 mb-3 bg-black/40 h-8 p-1">
                  <TabsTrigger value="daily" className="text-[8px] font-black uppercase">PÄIVÄ</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-[8px] font-black uppercase">KUUKAUSI</TabsTrigger>
                </TabsList>
                <div className="space-y-3">
                  <Input 
                    type={entryType === 'daily' ? 'date' : 'month'} 
                    value={entryType === 'daily' ? formData.date : formData.month}
                    onChange={(e) => setFormData({...formData, [entryType === 'daily' ? 'date' : 'month']: e.target.value})}
                    className="bg-black/40 h-8 text-[10px] font-bold border-white/5"
                  />
                  <div className="relative">
                    <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input type="number" placeholder="MYYNTI (ALV 0%)" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} className="pl-8 bg-white/5 h-10 text-sm font-black border-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="RAAKA-AIN. €" value={formData.foodCost} onChange={(e) => setFormData({...formData, foodCost: e.target.value})} className="bg-white/5 h-8 text-[10px] font-bold border-white/10" />
                    <Input type="number" placeholder="TUNNIT (H)" value={formData.workHours} onChange={(e) => setFormData({...formData, workHours: e.target.value})} className="bg-white/5 h-8 text-[10px] font-bold border-white/10" />
                  </div>
                </div>
              </Tabs>
              <Button onClick={handleSave} className="w-full copper-gradient text-white font-black h-9 text-[10px] uppercase tracking-widest mt-1">TALLENNA</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <Card className="industrial-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[9px] font-black text-accent flex items-center gap-2 uppercase tracking-widest">
                <BarChart3 className="w-3 h-3" /> KEHITYS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="h-[160px] w-full bg-black/20 rounded-xl p-2 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="pvm" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 900}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '7px', fontWeight: 'bold' }} />
                    <Bar dataKey="myynti" fill="#b87333" radius={[2, 2, 0, 0]} name="Myynti" barSize={10} />
                    <Bar dataKey="tulos" fill="#71717a" radius={[2, 2, 0, 0]} name="Tulos" barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="industrial-card">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[9px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                <HistoryIcon className="w-3 h-3" /> HISTORIA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {records.slice(0, 4).map(r => {
                  const profit = r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
                  return (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-0.5 h-6 rounded-full", profit >= 0 ? "bg-green-500" : "bg-destructive")} />
                        <div>
                          <p className="text-[9px] font-black text-foreground">{r.date}</p>
                          <p className="text-[7px] text-muted-foreground font-bold">{r.revenue.toLocaleString()} €</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-black tabular-nums", profit >= 0 ? "text-green-500" : "text-destructive")}>{profit > 0 ? "+" : ""}{profit.toLocaleString()}€</span>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="h-6 w-6 text-destructive/40 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></Button>
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
