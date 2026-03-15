"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth, useFirestore } from "@/firebase"
import { signInAnonymously, setPersistence, browserLocalPersistence } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Loader2, Users } from "lucide-react"

function JoinHandler() {
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const adminId = searchParams.get('adminId')
  const role = searchParams.get('role') || 'worker'

  useEffect(() => {
    if (!auth || !firestore || !adminId) {
      if (!adminId) setError("Virheellinen kutsulinkki.")
      return
    }

    const processJoin = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
        const cred = await signInAnonymously(auth)
        const userId = cred.user.uid

        // Lisätään jäsen adminin tiimiin
        const teamMemberRef = doc(firestore, 'userProfiles', adminId, 'teamMembers', userId)
        await setDoc(teamMemberRef, {
          userId,
          role,
          joinedAt: serverTimestamp(),
          status: 'active'
        })

        // Luodaan oma profiili jäsenelle
        const profileRef = doc(firestore, 'userProfiles', userId)
        await setDoc(profileRef, {
          role: 'worker',
          ownerId: adminId,
          userName: `Jäsen-${userId.slice(0, 4)}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true })

        router.push('/dashboard')
      } catch (err) {
        console.error("Join error:", err)
        setError("Liittyminen epäonnistui.")
      }
    }

    processJoin()
  }, [auth, firestore, adminId, role, router])

  if (error) return <div className="text-destructive font-black p-10 text-center">{error}</div>

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center animate-bounce">
        <Users className="w-8 h-8 text-accent" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Liitytään tiimiin...</p>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Ladataan...</div>}>
      <JoinHandler />
    </Suspense>
  )
}
