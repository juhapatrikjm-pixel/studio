"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Send, Loader2 } from "lucide-react"
import { summarizeTeamDiscussion } from "@/ai/flows/summarize-team-discussion-flow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Message = {
  id: string
  sender: string
  content: string
  time: string
  isSelf?: boolean
}

export function MessagingModule() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "Alice", content: "Hey team, did we finalize the Q4 budget proposal?", time: "09:00 AM" },
    { id: "2", sender: "Bob", content: "Not yet, Sarah is still checking the hardware costs for the new hires.", time: "09:05 AM" },
    { id: "3", sender: "Sarah", content: "I've updated the sheet. Hardware costs are 12% higher than expected due to shipping delays.", time: "09:12 AM" },
    { id: "4", sender: "Alice", content: "Got it. We should adjust the operations buffer then.", time: "09:15 AM" },
    { id: "5", sender: "Sarah", content: "Agreed. I will send the final draft by EOD.", time: "09:20 AM" },
  ])
  const [input, setInput] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const handleSend = () => {
    if (!input.trim()) return
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    }
    setMessages([...messages, newMessage])
    setInput("")
  }

  const handleSummarize = async () => {
    setIsSummarizing(true)
    const discussionText = messages.map(m => `${m.sender}: ${m.content}`).join("\n")
    try {
      const result = await summarizeTeamDiscussion({ discussionText })
      setSummary(result.summary)
    } catch (error) {
      console.error("AI Summary error:", error)
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-headline font-bold text-accent"># budget-planning</h2>
          <p className="text-sm text-muted-foreground italic">Secure line active</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-primary text-accent hover:bg-primary/10 shadow-sm"
          onClick={handleSummarize}
          disabled={isSummarizing}
        >
          {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
          AI Summary
        </Button>
      </header>

      {summary && (
        <Alert className="bg-primary/10 border-primary/40 mb-4 animate-breathing">
          <Sparkles className="w-4 h-4 text-accent" />
          <AlertTitle className="font-headline text-accent font-bold">Process Intelligence Summary</AlertTitle>
          <AlertDescription className="text-sm text-foreground/90 font-medium leading-relaxed">
            {summary}
          </AlertDescription>
          <Button variant="ghost" size="sm" className="mt-2 h-7 p-0 text-xs text-accent underline hover:bg-transparent" onClick={() => setSummary(null)}>Acknowledge & Dismiss</Button>
        </Alert>
      )}

      <ScrollArea className="flex-1 pr-4 min-h-[400px]">
        <div className="flex flex-col gap-6 py-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
              {!msg.isSelf && (
                <Avatar className="w-8 h-8 border border-primary/20">
                  <AvatarImage src={`https://picsum.photos/seed/${msg.sender}/200/200`} />
                  <AvatarFallback className="bg-muted text-accent">{msg.sender[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col max-w-[80%] ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-muted-foreground">{msg.sender}</span>
                  <span className="text-[10px] text-muted-foreground opacity-60">{msg.time}</span>
                </div>
                <div className={`p-4 rounded-xl text-sm shadow-lg ${
                  msg.isSelf 
                  ? 'copper-gradient text-white rounded-tr-none' 
                  : 'bg-card border border-border rounded-tl-none text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <footer className="flex gap-2 pt-4 border-t border-border items-center bg-background/50 backdrop-blur-sm pb-2">
        <Input 
          placeholder="Enter secure message..." 
          className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-accent" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button className="copper-gradient hover:opacity-90 shadow-md" size="icon" onClick={handleSend}>
          <Send className="w-4 h-4" />
        </Button>
      </footer>
    </div>
  )
}