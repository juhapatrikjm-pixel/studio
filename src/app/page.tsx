
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LogIn, Loader2, AlertCircle, Globe } from "lucide-react"

export default function LoginPage() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<{ title: string, desc: string } | null>(null)
  const [currentDomain, setCurrentDomain] = useState("")

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.host)
    }
  }, [])

  // Käsitellään redirect-tulos heti alussa
  useEffect(() => {
    if (!auth || !firestore) return

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          const u = result.user
          // Tallennetaan profiili taustalla
          setDoc(doc(firestore, 'userProfiles', u.uid), {
            userName: u.displayName,
            email: u.email,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(e => console.warn("Firestore sync deferred."))
          router.push('/dashboard')
        } else if (user) {
          // Jos ollaan jo kirjautuneena, mennään suoraan dashboardille
          router.push('/dashboard')
        }
      } catch (err: any) {
        console.error("Auth redirect error:", err)
        setError({ 
          title: "Kirjautumisvirhe", 
          desc: err.code === 'auth/unauthorized-domain' 
            ? "Domainia ei ole valtuutettu Firebase-konsolissa." 
            : err.message 
        })
      } finally {
        setIsProcessing(false)
      }
    }

    checkRedirect()
  }, [auth, firestore, user, router])

  const handleLogin = async () => {
    if (!auth) return
    const provider = new GoogleAuthProvider()
    try {
      await signInWithRedirect(auth, provider)
    } catch (err: any) {
      setError({ title: "Virhe", desc: "Kirjautumisen aloittaminen epäonnistui." })
    }
  }

  if (authLoading || isProcessing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl copper-gradient animate-pulse shadow-2xl" />
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">Tarkistetaan istuntoa...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 brushed-metal relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full" />
      </div>

      <Card className="industrial-card max-w-sm w-full relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 copper-gradient metal-shine-overlay" />
        <CardContent className="p-8 flex flex-col items-center text-center gap-8">
          <div className="w-20 h-20 rounded-2xl copper-gradient flex items-center justify-center shadow-2xl metal-shine-overlay">
            <span className="text-white font-headline font-black text-3xl drop-shadow-xl">W</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-black copper-text-glow uppercase tracking-tighter">Wisemisa</h1>
            <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.3em] opacity-60">Industrial Kitchen Platform</p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-left">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-sm font-black uppercase">{error.title}</AlertTitle>
              <AlertDescription className="text-xs leading-tight opacity-80">{error.desc}</AlertDescription>
            </Alert>
          )}
          
          <div className="w-full space-y-4">
            <Button onClick={handleLogin} className="w-full h-14 copper-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl metal-shine-overlay">
              <LogIn className="w-5 h-5 mr-3" /> KIRJAUDU GOOGLELLA
            </Button>
          </div>
          
          <div className="pt-6 flex flex-col items-center gap-4 bg-black/20 p-6 rounded-xl border border-white/5 w-full">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">VALTUUTA TÄMÄ OSOITE:</span>
            </div>
            <code className="text-xs font-mono bg-black/40 p-3 rounded border border-white/10 text-accent w-full break-all select-all">{currentDomain}</code>
            <p className="text-[8px] text-muted-foreground/60 uppercase font-bold italic">Firebase Console &rarr; Auth &rarr; Settings &rarr; Domains</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
