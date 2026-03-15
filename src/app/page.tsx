"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInAnonymously, setPersistence, browserLocalPersistence } from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Zap } from "lucide-react"

/**
 * Invisible Login Page
 * Kirjaa käyttäjän sisään anonyymisti ja ohjaa dashboardiin.
 * Jos kyseessä on uusi käyttäjä, asettaa rooliksi "admin" prototyyppausta varten.
 */
export default function LoginPage() {
  const { user, loading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const [status, setStatus] = useState("Alustetaan järjestelmää...")

  useEffect(() => {
    if (!auth || !firestore || loading) return

    const handleAutoLogin = async () => {
      try {
        if (!user) {
          setStatus("Luodaan suojattua istuntoa...")
          await setPersistence(auth, browserLocalPersistence)
          const cred = await signInAnonymously(auth)
          
          // Tarkistetaan onko profiili jo olemassa
          const profileRef = doc(firestore, 'userProfiles', cred.user.uid)
          const snap = await getDoc(profileRef)
          
          if (!snap.exists()) {
            setStatus("Määritetään ylläpitäjän oikeuksia...")
            await setDoc(profileRef, {
              role: 'admin',
              userName: `Admin-${cred.user.uid.slice(0, 4)}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              moduleOrder: []
            })
          }
        }
        
        setStatus("Yhteys muodostettu.")
        router.push('/dashboard')
      } catch (err) {
        console.error("Auth error:", err)
        setStatus("Virhe kirjautumisessa. Tarkista verkkoyhteys.")
      }
    }

    handleAutoLogin()
  }, [user, auth, firestore, loading, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="w-20 h-20 rounded-2xl copper-gradient flex items-center justify-center shadow-2xl animate-breathing">
        <Zap className="w-10 h-10 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-headline font-black copper-text-glow uppercase tracking-tighter">Wisemisa Intelligence</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-widest">{status}</p>
        </div>
      </div>
    </div>
  )
}
