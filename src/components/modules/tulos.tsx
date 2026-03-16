"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
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
import { financialSchema } from "@/lib/validations"
import { calculateFinancials } from "@/lib/calculations"

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

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const currentMonthRecords = records.filter(r => {
      try {
        const d = r.entryType === 'monthly' ? parseISO(r.date + "-01") : parseISO(r.date)
        return isSameMonth(d, now)
      } catch (e) { return false }
    })
    return calculateFinancials(currentMonthRecords, hourlyRate);
  }, [records, hourlyRate])

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
    if (!firestore || !recordsRef) return
    const recordDate = entryType === 'daily' ? formData.date : formData.month
    const laborCost = (Number(formData.workHours.replace(',', '.')) || 0) * hourlyRate

    const rawData = {
      date: recordDate, entryType, revenue: formData.revenue, foodCost: formData.foodCost,
      workHours: formData.workHours, laborCost: laborCost,
      otherExpenses: formData.otherExpenses || 0, comment: formData.comment
    }

    const result = financialSchema.safeParse(rawData)
    if (!result.success) {
      toast({ variant: "destructive", title: "Syöttövirhe", description: result.error.errors[0].message });
      return
    }

    setDoc(doc(firestore, 'financialRecords', recordDate), { ...result.data, id: recordDate, createdAt: serverTimestamp() }, { merge: true })
      .then(() => {
        toast({ title: "Tiedot tallennettu" });
        setFormData({ ...formData, revenue: "", foodCost: "", workHours: "", otherExpenses: "", comment: "" });
      })
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-10">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Gem className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Tulos</h2>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "MYYNTI", val: `${monthlyStats.totals.revenue.toLocaleString('fi-FI')} €`, color: "copper-gradient" },
          { label: "RAAKA-AINE %", val: `${monthlyStats.foodCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "PALKKA %", val: `${monthlyStats.laborCostPerc.toFixed(1)} %`, color: "steel-detail" },
          { label: "KATE", val: `${monthlyStats.profit.toLocaleString('fi-FI')} €`, color: "copper-gradient", highlight: true },
        ].map((kpi, i) => (
          <Card key={i} className="industrial-card overflow-hidden">
            <div className={cn("absolute top-0 left-0 w-full h-1", kpi.color)} />
            <CardContent className="p-4 text-center">
              <p className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest mb-1">{kpi.label}</p>
              <div className={cn("text-xl font-black tabular-nums", kpi.highlight ? (monthlyStats.profit >= 0 ? "text-green-500" : "text-destructive") : "text-foreground")}>{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-sm font-black text-accent flex items-center gap-2 uppercase tracking-widest"><Calculator className="w-4 h-4" /> UUSI KIRJAUS</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={entryType} onValueChange={(v: any) => setEntryType(v)}>
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-black/40"><TabsTrigger value="daily" className="text-[10px] font-black uppercase">PÄIVÄ</TabsTrigger><TabsTrigger value="monthly" className="text-[10px] font-black uppercase">KUUKAUSI</TabsTrigger></TabsList>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Päivämäärä</Label>
                    <Input type={entryType === 'daily' ? 'date' : 'month'} value={entryType === 'daily' ? formData.date : formData.month} onChange={(e) => setFormData({...formData, [entryType === 'daily' ? 'date' : 'month']: e.target.value})} className="bg-black/40 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Myynti</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="0,00" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} className="pl-10 text-lg font-black" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ainekset €</Label>
                      <Input placeholder="0,00" value={formData.foodCost} onChange={(e) => setFormData({...formData, foodCost: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tunnit (h)</Label>
                      <Input placeholder="0" value={formData.workHours} onChange={(e) => setFormData({...formData, workHours: e.target.value})} />
                    </div>
                  </div>
                </div>
              </Tabs>
              <Button onClick={handleSave} className="w-full copper-gradient text-white font-black h-12 uppercase tracking-widest mt-2">TALLENNA</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="industrial-card">
            <CardHeader><CardTitle className="text-sm font-black text-accent flex items-center gap-2 uppercase tracking-widest"><BarChart3 className="w-4 h-4" /> KEHITYS</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px] w-full bg-black/20 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="pvm" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="myynti" fill="#b87333" radius={[4, 4, 0, 0]} name="Myynti" barSize={30} />
                    <Bar dataKey="tulos" fill="#71717a" radius={[4, 4, 0, 0]} name="Tulos" barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
