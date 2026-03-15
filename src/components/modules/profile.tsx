
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Building2, 
  Phone, 
  MapPin, 
  IdCard, 
  Share2, 
  Save, 
  Image as ImageIcon,
  Upload
} from "lucide-react"
import { useFirestore, useDoc, useUser } from "@/firebase"
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function ProfileModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const userId = user?.uid || "unknown"
  const profileRef = useMemo(() => (firestore ? doc(firestore, 'userProfiles', userId) : null), [firestore, userId])
  const { data: profile } = useDoc<any>(profileRef)

  const [formData, setFormData] = useState({
    companyName: "",
    userName: "",
    title: "",
    workPhone: "",
    personalPhone: "",
    address: "",
    businessId: "",
    logoUrl: ""
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || "",
        userName: profile.userName || user?.displayName || "",
        title: profile.title || "",
        workPhone: profile.workPhone || "",
        personalPhone: profile.personalPhone || "",
        address: profile.address || "",
        businessId: profile.businessId || "",
        logoUrl: profile.logoUrl || user?.photoURL || ""
      })
    }
  }, [profile, user])

  const handleSave = () => {
    if (!profileRef) return
    setDoc(profileRef, {
      ...formData,
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(() => {
        toast({
          title: "Profiili tallennettu",
          description: "Tietosi on päivitetty järjestelmään.",
        })
      })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleShare = () => {
    const shareText = `
${formData.companyName}
${formData.userName} - ${formData.title}
Puh: ${formData.workPhone}
Osoite: ${formData.address}
Y-tunnus: ${formData.businessId}
    `.trim()

    if (navigator.share) {
      navigator.share({
        title: `${formData.userName} - Käyntikortti`,
        text: shareText,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareText)
      toast({
        title: "Kopioitu leikepöydälle",
        description: "Käyntikortin tiedot on kopioitu tekstimuodossa.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-headline font-bold text-accent">Profiili</h2>
        <p className="text-muted-foreground">Hallitse yrityksesi ja omia tietojasi.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-card border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full copper-gradient opacity-30" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Yrityksen ja omat tiedot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Yrityksen nimi</Label>
                  <Input 
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="Esim. Keittiö Oy"
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Oma nimi</Label>
                  <Input 
                    value={formData.userName}
                    onChange={(e) => setFormData({...formData, userName: e.target.value})}
                    placeholder="Esim. Matti Meikäläinen"
                    className="bg-muted/30 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Titteli</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Esim. Keittiömestari"
                  className="bg-muted/30 border-border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Työpuhelin</Label>
                  <Input 
                    value={formData.workPhone}
                    onChange={(e) => setFormData({...formData, workPhone: e.target.value})}
                    placeholder="+358..."
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Henkilökohtainen puhelin</Label>
                  <Input 
                    value={formData.personalPhone}
                    onChange={(e) => setFormData({...formData, personalPhone: e.target.value})}
                    placeholder="+358..."
                    className="bg-muted/30 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Yrityksen logo</Label>
                <div className="flex gap-2 items-center">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <Button variant="outline" className="bg-muted/30 border-border flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> 
                    {formData.logoUrl ? "Vaihda logo" : "Lataa galleriasta"}
                  </Button>
                  <div className="w-12 h-12 rounded border border-border flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
                    {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full copper-gradient text-white font-bold h-12 gap-2 mt-4 shadow-lg">
                <Save className="w-5 h-5" /> Tallenna muutokset
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-30" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <IdCard className="w-5 h-5 text-accent" />
                Käyntikortti
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="w-full max-w-sm aspect-[1.6/1] rounded-2xl p-8 bg-gradient-to-br from-sidebar via-sidebar to-sidebar border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group/card">
                <div className="absolute top-0 left-0 w-full h-1 copper-gradient opacity-20" />
                <div className="h-full flex flex-col justify-between relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-headline font-bold text-accent tracking-tight">{formData.companyName || "Keittiösi"}</h3>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-[0.2em]">{formData.businessId}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg copper-gradient flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">{formData.companyName?.[0] || "W"}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-headline font-bold text-foreground leading-tight">{formData.userName}</p>
                      <p className="text-[10px] text-accent uppercase font-bold tracking-widest">{formData.title}</p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Phone className="w-2.5 h-2.5 text-accent/60" />
                        <span>{formData.workPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={handleShare} className="w-full steel-detail text-background font-bold h-10 gap-2 shadow-lg">
                <Share2 className="w-4 h-4" /> Jaa käyntikortti
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
