
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Clock
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, isSameMonth } from "date-fns"
import { fi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    revenue: "",
    foodCost: "",
    workHours: "",
    otherExpenses: "",
    comment: ""
  })

  // Lasketaan palkkakulut reaaliajassa näkymään
  const currentLaborCost = useMemo(() => {
    const hours = Number(formData.workHours) || 0
    return hours * hourlyRate
  }, [formData.workHours, hourlyRate])

  // Laskelmat kuukausitasolla
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const currentMonthRecords = records.filter(r => isSameMonth(new Date(r.date), now))
    
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

  // Datan valmistelu kaaviota varten (viimeiset 7 kirjausta)
  const chartData = useMemo(() => {
    return records.slice(0, 7).reverse().map(r => ({
      pvm: format(new Date(r.date), 'd.M.'),
      myynti: r.revenue,
      tulos: r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)
    }))
  }, [records])

  const handleSave = () => {
    if (!firestore || !recordsRef || !formData.revenue) return
    
    const id = formData.date
    const docRef = doc(firestore, 'financialRecords', id)
    
    const laborCost = Number(formData.workHours) * hourlyRate

    const dataToSave = {
      id,
      date: formData.date,
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
          description: `Päivän ${format(new Date(formData.date), 'd.M.')} luvut ja palkkakulut (${laborCost.toFixed(2)} €) päivitetty.`,
        })
        setFormData({
          ...formData,
          revenue: "",
          foodCost: "",
          workHours: "",
          otherExpenses: "",
          comment: ""
        })
      })
  }

  const deleteRecord = (id: string) => {
    if (!firestore) return
    deleteDoc(doc(firestore, 'financialRecords', id))
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Tulos & Seuranta</h2>
        <p className="text-muted-foreground">Seuraa ravintolasi taloutta ja kannattavuutta päivittäin.</p>
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
            <p className="text-[9px] text-muted-foreground mt-1">{monthlyStats.count} kirjausta</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Raaka-aineet %</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold">{monthlyStats.foodCostPerc.toFixed(1)} %</div>
            <p className="text-[9px] text-muted-foreground mt-1">Tavoite: 28-32%</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Palkat %</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xl font-bold">{monthlyStats.laborCostPerc.toFixed(1)} %</div>
            <p className="text-[9px] text-muted-foreground mt-1">Tunnit: {monthlyStats.totals.workHours.toFixed(1)} h</p>
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
            <p className="text-[9px] text-muted-foreground mt-1">Marginaali: {monthlyStats.marginPerc.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Päivän kirjaus */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-50" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent" />
                Kirjaa päivän luvut
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Päivämäärä</Label>
                <Input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-muted/30 border-border"
                />
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
                  {formData.workHours && (
                    <p className="text-[9px] text-accent font-bold uppercase mt-1">
                      = {currentLaborCost.toFixed(2)} € ({hourlyRate} €/h)
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Muut kulut</Label>
                <Input 
                  type="number" 
                  placeholder="Esim. vuokra, sähkö (osuus)"
                  value={formData.otherExpenses}
                  onChange={(e) => setFormData({...formData, otherExpenses: e.target.value})}
                  className="bg-muted/30 border-border"
                />
              </div>
              <Button onClick={handleSave} className="w-full copper-gradient text-white font-bold h-12 gap-2 mt-4 shadow-lg">
                <Save className="w-5 h-5" /> Tallenna päivä
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
                  Trendi
                </CardTitle>
                <CardDescription className="text-xs">Viimeiset 7 kirjausta</CardDescription>
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
            <CardHeader>
              <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Viimeisimmät merkinnät</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {records.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 group hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-accent">{format(new Date(r.date), 'EEEE d.M.', { locale: fi })}</span>
                        <div className="flex gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase">{r.revenue.toLocaleString()} € myynti</span>
                          <span className="text-[10px] text-muted-foreground/60 uppercase">({r.workHours || 0} h)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={cn(
                          "text-xs font-bold",
                          (r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)) >= 0 ? "text-green-500" : "text-destructive"
                        )}>
                          {(r.revenue - (r.foodCost || 0) - (r.laborCost || 0) - (r.otherExpenses || 0)).toLocaleString()} €
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Kate</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
