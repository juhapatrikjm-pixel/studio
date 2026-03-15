
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { 
  signInAnonymously, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, AlertCircle, Globe, Zap, Loader2, Mail, CheckCircle2, QrCode } from "lucide-react"

export default function LoginPage() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<{ title: string, desc: string } | null>(null)
  const [currentDomain, setCurrentDomain] = useState("")

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.host)
    }
  }, [])

  // MAGIC LINK DETECTION
  useEffect(() => {
    if (!auth || !firestore) return

    const handleMagicLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setIsProcessing(true)
        let emailForSignIn = window.localStorage.getItem('emailForSignIn')
        
        if (!emailForSignIn) {
          emailForSignIn = window.prompt('Vahvista sähköpostiosoitteesi viimeistelläksesi kirjautumisen:')
        }

        if (emailForSignIn) {
          try {
            const result = await signInWithEmailLink(auth, emailForSignIn, window.location.href)
            window.localStorage.removeItem('emailForSignIn')
            await syncProfile(result.user)
            router.push('/dashboard')
          } catch (err: any) {
            console.error("Magic link error:", err)
            setError({ title: "Kirjautumislinkki vanhentunut", desc: "Pyydä uusi linkki alta." })
          } finally {
            setIsProcessing(false)
          }
        }
      } else if (user) {
        router.push('/dashboard')
      }
    }

    handleMagicLink()
  }, [user, auth, firestore, router])

  const syncProfile = async (u: any) => {
    if (!firestore) return
    try {
      await setDoc(doc(firestore, 'userProfiles', u.uid), {
        userName: u.displayName || "Käyttäjä",
        email: u.email,
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (e) {
      console.warn("Firestore sync skipped:", e)
    }
  }

  const handleEmailLinkLogin = async () => {
    if (!auth || !email.trim()) return
    setIsProcessing(true)
    setError(null)

    const actionCodeSettings = {
      url: window.location.href, // Paluu tälle samalle sivulle
      handleCodeInApp: true,
    }

    try {
      await setPersistence(auth, browserLocalPersistence)
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      window.localStorage.setItem('emailForSignIn', email)
      setEmailSent(true)
    } catch (err: any) {
      console.error("Email link send error:", err)
      setError({ title: "Lähetys epäonnistui", desc: "Tarkista sähköpostiosoite tai kokeile myöhemmin uudelleen." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDemoLogin = async () => {
    if (!auth) return
    setIsProcessing(true)
    try {
      await setPersistence(auth, browserLocalPersistence)
      await signInAnonymously(auth)
      router.push('/dashboard')
    } catch (err: any) {
      setError({ title: "Demo-virhe", desc: "Demo-tilaan pääsy epäonnistui." })
    } finally {
      setIsProcessing(false)
    }
  }

  if (authLoading || isProcessing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl copper-gradient animate-pulse shadow-2xl" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">Käsitellään istuntoa...</span>
        </div>
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
            <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.3em] opacity-60">Industrial Kitchen Intelligence</p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-left">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-sm font-black uppercase">{error.title}</AlertTitle>
              <AlertDescription className="text-xs leading-tight opacity-80">{error.desc}</AlertDescription>
            </Alert>
          )}

          {!emailSent ? (
            <div className="w-full space-y-6">
              <div className="space-y-3 text-left">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Sähköpostiosoite</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="kokki@wisemisa.fi" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-black/40 border-white/10 h-12 text-sm font-bold focus:border-accent/40"
                  />
                </div>
                <Button onClick={handleEmailLinkLogin} className="w-full h-14 copper-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl metal-shine-overlay">
                  LÄHETÄ KIRJAUTUMISLINKKI
                </Button>
              </div>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-muted-foreground/40 uppercase">tai</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <Button onClick={handleDemoLogin} variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                <Zap className="w-4 h-4 mr-2 text-accent" /> KOKEILE DEMO-TILASSA
              </Button>
            </div>
          ) : (
            <div className="w-full py-6 space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-headline font-black text-foreground uppercase">Linkki lähetetty!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tarkista sähköpostisi <b>{email}</b>.<br/>
                  Voit klikata linkkiä tai skannata linkin sisältämän QR-koodin millä tahansa laitteella.
                </p>
              </div>
              <Button onClick={() => setEmailSent(false)} variant="ghost" className="text-[10px] font-black uppercase text-accent hover:bg-accent/5">
                KOKEILE TOISTA SÄHKÖPOSTIA
              </Button>
            </div>
          )}
          
          <div className="pt-6 flex flex-col items-center gap-4 bg-black/20 p-6 rounded-xl border border-white/5 w-full">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">VALTUUTETTU DOMAIN:</span>
            </div>
            <code className="text-[10px] font-mono bg-black/40 p-3 rounded border border-white/10 text-accent w-full break-all select-all">{currentDomain}</code>
            <p className="text-[8px] text-muted-foreground/60 uppercase font-bold italic">Firebase Console &rarr; Auth &rarr; Settings &rarr; Domains</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
