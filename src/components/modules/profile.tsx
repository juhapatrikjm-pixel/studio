
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  UserCircle, 
  Building2, 
  Phone, 
  MapPin, 
  IdCard, 
  Share2, 
  Save, 
  Image as ImageIcon,
  CheckCircle2,
  Mail,
  History
} from "lucide-react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ProfileModule() {
  const firestore = useFirestore()
  const { toast } = useToast()
  
  // Käytetään tässä demo-tarkoituksessa kiinteää ID:tä, 
  // oikeassa sovelluksessa tämä tulisi useUser() koukulta.
  const userId = "demo-user-123"
  const profileRef = useMemo(() => (firestore ? doc(firestore, 'userProfiles', userId) : null), [firestore])
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
        userName: profile.userName || "",
        title: profile.title || "",
        workPhone: profile.workPhone || "",
        personalPhone: profile.personalPhone || "",
        address: profile.address || "",
        businessId: profile.businessId || "",
        logoUrl: profile.logoUrl || ""
      })
    }
  }, [profile])

  const handleSave = () => {
    if (!profileRef) return
    setDoc(profileRef, {
      ...formData,
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(() => {
        toast({
          title: "Profiili tallennettu",
          description: "Tietosi on päivitetty ja käyntikortti on valmis.",
        })
      })
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
      }).catch(() => {
        // Fallback jos jakaminen perutaan tai ei onnistu
      })
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
        <h2 className="text-3xl font-headline font-bold text-accent">Profiili & Käyntikortti</h2>
        <p className="text-muted-foreground">Hallitse yrityksesi tietoja ja generoi digitaalinen käyntikortti.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lomake */}
        <div className="space-y-6">
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
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Osoite</Label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Katuosoite, kaupunki"
                  className="bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Y-tunnus</Label>
                <Input 
                  value={formData.businessId}
                  onChange={(e) => setFormData({...formData, businessId: e.target.value})}
                  placeholder="1234567-8"
                  className="bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Logon URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                    placeholder="https://..."
                    className="bg-muted/30 border-border flex-1"
                  />
                  <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full copper-gradient text-white font-bold h-12 gap-2 mt-4 shadow-lg">
                <Save className="w-5 h-5" /> Tallenna tiedot
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Käyntikortti Generointi */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full steel-detail opacity-30" />
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <IdCard className="w-5 h-5 text-accent" />
                Esikatselu
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                Automaattisesti generoitu käyntikortti
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              {/* Käyntikortti Visualisointi */}
              <div className="w-full max-w-sm aspect-[1.6/1] rounded-2xl p-8 bg-gradient-to-br from-sidebar via-sidebar to-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group/card hover:scale-[1.02] transition-transform duration-500">
                {/* Koriste-elementit */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-0 left-0 w-full h-1 copper-gradient opacity-20" />
                
                <div className="h-full flex flex-col justify-between relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      {formData.companyName && (
                        <h3 className="text-xl font-headline font-bold text-accent tracking-tight">{formData.companyName}</h3>
                      )}
                      {formData.businessId && (
                        <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-[0.2em]">{formData.businessId}</p>
                      )}
                    </div>
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg copper-gradient flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">{formData.companyName?.[0] || "W"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-0.5">
                      {formData.userName && (
                        <p className="text-lg font-headline font-bold text-foreground leading-tight">{formData.userName}</p>
                      )}
                      {formData.title && (
                        <p className="text-[10px] text-accent uppercase font-bold tracking-widest">{formData.title}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {formData.workPhone && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Phone className="w-2.5 h-2.5 text-accent/60" />
                          <span>{formData.workPhone}</span>
                        </div>
                      )}
                      {formData.personalPhone && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Phone className="w-2.5 h-2.5 text-accent/60 opacity-50" />
                          <span>{formData.personalPhone}</span>
                        </div>
                      )}
                      {formData.address && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <MapPin className="w-2.5 h-2.5 text-accent/60" />
                          <span>{formData.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleShare} className="w-full steel-detail text-background font-bold h-10 gap-2 shadow-lg hover:opacity-90">
                <Share2 className="w-4 h-4" /> Jaa käyntikortti
              </Button>
              <p className="text-[10px] text-muted-foreground italic text-center">
                Vinkki: Kortti sivuuttaa automaattisesti tyhjäksi jätetyt kentät.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tallennetut tiedot / Historia */}
      <div className="space-y-4 pt-10 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <History className="w-5 h-5" />
          <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Tallennetut profiilitiedot</h3>
        </div>
        
        {profile ? (
          <Card className="bg-card border-border shadow-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Yritys</p>
                  <p className="text-sm font-bold">{profile.companyName || "---"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Nimi</p>
                  <p className="text-sm font-bold">{profile.userName || "---"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Puh (Työ)</p>
                  <p className="text-sm font-bold">{profile.workPhone || "---"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Päivitetty</p>
                  <p className="text-sm font-bold">
                    {profile.updatedAt ? new Date(profile.updatedAt.seconds * 1000).toLocaleString('fi') : "---"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
            Ei aiempia tallennuksia. Täytä profiilisi aloittaaksesi.
          </div>
        )}
      </div>
    </div>
  )
}
