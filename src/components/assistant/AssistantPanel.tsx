'use client'
import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { X, Send, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AssistantPanel() {
  const { assistantOpen, setAssistantOpen } = useUIStore()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content ?? 'Sorry, something went wrong.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error connecting to assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!assistantOpen) return null

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#111111] border-l border-[#262626] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#262626] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-amber-400" />
          <span className="text-sm font-medium text-gray-100">AI Assistant</span>
        </div>
        <button onClick={() => setAssistantOpen(false)} className="text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <Bot size={32} className="mx-auto mb-2 text-amber-400/30" />
            <p>Hi {user?.firstName}! How can I help you today?</p>
            <p className="text-xs mt-1">Ask about leads, customers, or get help drafting emails.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-amber-400 text-black'
                  : 'bg-[#1a1a1a] text-gray-200'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] rounded-xl px-3 py-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-[#262626] flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything..."
          className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-amber-400/50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-amber-400 text-black disabled:opacity-40 hover:bg-amber-300 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
