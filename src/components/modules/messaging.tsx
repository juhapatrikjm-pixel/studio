"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Send, Loader2, Trash2 } from "lucide-react"
import { summarizeTeamDiscussion } from "@/ai/flows/summarize-team-discussion-flow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, doc, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore"
import { format } from "date-fns"

type Message = {
  id: string
  sender: string
  userId: string
  content: string
  time: any
}

const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore: (message: Message): DocumentData => {
    const { id, ...data } = message;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options): Message => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      sender: data.sender,
      userId: data.userId,
      content: data.content,
      time: data.time
    };
  }
};

export function MessagingModule() {
  const firestore = useFirestore()
  const { user } = useUser()
  
  const profileRef = useMemo(() => (firestore && user ? doc(firestore, 'userProfiles', user.uid) : null), [firestore, user])
  const { data: profile } = useDoc<any>(profileRef)

  const messagesRef = useMemo(() => (firestore ? collection(firestore, 'messages').withConverter(messageConverter) : null), [firestore])
  const messagesQuery = useMemo(() => {
    if (!messagesRef) return null
    return query(messagesRef, orderBy('time', 'asc'), limit(100))
  }, [messagesRef])
  
  const { data: messages = [], loading: messagesLoading } = useCollection<Message>(messagesQuery)

  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const handleSend = async () => {
    if (!input.trim() || !messagesRef || !user) return
    setIsSending(true)
    try {
      await addDoc(messagesRef, {
        sender: profile?.userName || user.displayName || "Käyttäjä",
        userId: user.uid,
        content: input,
        time: serverTimestamp()
      } as Omit<Message, 'id'>)
      setInput("")
    } catch (e) {
      console.error("Virhe viestin lähetyksessä:", e)
    } finally {
      setIsSending(false)
    }
  }

  const handleSummarize = async () => {
    if (messages.length === 0) return
    setIsSummarizing(true)
    const discussionText = messages.map(m => `${m.sender}: ${m.content}`).join("\n")
    try {
      const result = await summarizeTeamDiscussion({ discussionText })
      setSummary(result.summary)
    } catch (error) {
      console.error("AI-yhteenvedon virhe:", error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!messagesRef) return
    try {
      await deleteDoc(doc(messagesRef, id))
    } catch (e) {
      console.error("Virhe poistossa:", e)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-headline font-bold text-accent"># tiimi-chat</h2>
          <p className="text-sm text-muted-foreground italic">Reaaliaikainen yhteys pilvessä</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-primary text-accent hover:bg-primary/10 shadow-sm"
          onClick={handleSummarize}
          disabled={isSummarizing || messages.length === 0}
        >
          {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
          AI-yhteenveto
        </Button>
      </header>

      {summary && (
        <Alert className="bg-primary/10 border-primary/40 mb-4 animate-breathing">
          <Sparkles className="w-4 h-4 text-accent" />
          <AlertTitle className="font-headline text-accent font-bold">Prosessianalyysin yhteenveto</AlertTitle>
          <AlertDescription className="text-sm text-foreground/90 font-medium leading-relaxed">
            {summary}
          </AlertDescription>
          <Button variant="ghost" size="sm" className="mt-2 h-7 p-0 text-xs text-accent underline hover:bg-transparent" onClick={() => setSummary(null)}>Kuittaa ja poista</Button>
        </Alert>
      )}

      <ScrollArea className="flex-1 pr-4 min-h-[400px]">
        {messagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ladataan keskustelua...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            {messages.map((msg) => {
              const isSelf = msg.userId === user?.uid
              return (
                <div key={msg.id} className={`flex gap-3 group ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isSelf && (
                    <Avatar className="w-8 h-8 border border-primary/20">
                      <AvatarImage src={`https://picsum.photos/seed/${msg.userId}/200/200`} />
                      <AvatarFallback className="bg-muted text-accent">{msg.sender[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col max-w-[80%] ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground opacity-60">
                        {msg.time?.toDate ? format(msg.time.toDate(), 'HH:mm') : '--:--'}
                      </span>
                      {isSelf && (
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive/40 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className={`p-4 rounded-xl text-sm shadow-lg ${
                      isSelf 
                      ? 'copper-gradient text-white rounded-tr-none' 
                      : 'bg-card border border-border rounded-tl-none text-foreground'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Keskustelu on tyhjä. Aloita viestittely.</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <footer className="flex gap-2 pt-4 border-t border-border items-center bg-background/50 backdrop-blur-sm pb-2">
        <Input 
          placeholder="Kirjoita suojattu viesti..." 
          className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-accent" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isSending}
        />
        <Button 
          className="copper-gradient hover:opacity-90 shadow-md" 
          size="icon" 
          onClick={handleSend}
          disabled={isSending || !input.trim()}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </footer>
    </div>
  )
}
