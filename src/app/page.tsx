"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInAnonymously, setPersistence, browserLocalPersistence } from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Zap, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const [status, setStatus] = useState("Alustetaan järjestelmää...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth || !firestore || authLoading) return

    const handleAutoLogin = async () => {
      try {
        let currentUid = user?.uid;
        if (!user) {
          setStatus("Luodaan suojattua istuntoa...")
          await setPersistence(auth, browserLocalPersistence)
          const cred = await signInAnonymously(auth)
          currentUid = cred.user.uid;
        }
        
        if (currentUid) {
          const profileRef = doc(firestore, 'userProfiles', currentUid)
          const snap = await getDoc(profileRef)
          
          if (!snap.exists()) {
            setStatus("Määritetään ylläpitäjän oikeuksia...")
            await setDoc(profileRef, {
              role: 'admin',
              userName: `Ylläpitäjä-${currentUid.slice(0, 4)}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              moduleOrder: [],
              favorites: []
            })
          }
        }
        
        setStatus("Yhteys muodostettu.")
        router.push('/dashboard')
      } catch (err: any) {
        console.error("Auth error:", err)
        if (err.code === 'auth/admin-restricted-operation') {
          setError("ANONYMOUS_AUTH_DISABLED")
        } else {
          setError(err.message || "Tuntematon virhe kirjautumisessa.")
        }
      }
    }

    handleAutoLogin()
  }, [user, auth, firestore, authLoading, router])

  if (error === "ANONYMOUS_AUTH_DISABLED") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md border-accent/50 bg-accent/5">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-headline font-black uppercase tracking-tight">Toiminto vaaditaan</AlertTitle>
          <AlertDescription className="space-y-4 pt-2">
            <p className="text-xs font-bold leading-relaxed">
              Automaattinen kirjautuminen vaatii, että **Anonymous Authentication** on päällä Firebase-projektissasi.
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 text-[10px] font-mono space-y-2">
              <p>1. Mene Firebase Consoleen</p>
              <p>2. Build &rarr; Authentication</p>
              <p>3. Sign-in method &rarr; Add new provider</p>
              <p>4. Valitse "Anonymous" ja klikka "Enable"</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="w-20 h-20 rounded-2xl copper-gradient flex items-center justify-center shadow-2xl animate-breathing">
        <Zap className="w-10 h-10 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Wisemisa Intelligence</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          {error ? (
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive">{error}</p>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest">{status}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
