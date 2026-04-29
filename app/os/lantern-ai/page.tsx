'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

function LanternIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#D7261E" />
      <path d="M16 5L20 11H12L16 5Z" fill="white" opacity="0.9" />
      <rect x="12" y="11" width="8" height="11" rx="1" fill="white" opacity="0.85" />
      <rect x="14.5" y="22" width="3" height="4" rx="0.75" fill="white" opacity="0.7" />
      <circle cx="16" cy="16.5" r="2.5" fill="#D7261E" opacity="0.6" />
    </svg>
  )
}

export default function OsLanternAIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/os/lantern-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      if (!res.ok) throw new Error('Request failed')
      const { reply } = (await res.json()) as { reply: string }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <LanternIcon />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.3px', lineHeight: 1, marginBottom: 2 }}>
            LanternAI
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            Your intelligent operations assistant
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', scrollbarWidth: 'none' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <LanternIcon />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>
              How can I help you today?
            </p>
            <p style={{ fontSize: 12, color: '#52525B', maxWidth: 380, margin: '0 auto' }}>
              Ask me about your tasks, projects, blockers, or anything about your business operations.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {[
                "What are my critical blockers?",
                "Summarize today's priorities",
                "Which projects are at risk?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => { setInput(suggestion) }}
                  style={{
                    fontSize: 11, color: '#A1A1AA',
                    background: '#18181B', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,38,30,0.4)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? '#D7261E' : '#18181B',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                fontSize: 13,
                color: '#FAFAFA',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                background: '#18181B',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: 12,
                color: '#52525B',
              }}
            >
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 28px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 10px 8px 14px',
          }}
        >
          <input
            type="text"
            placeholder="Ask LanternAI anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#FAFAFA', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: 30, height: 30,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.06)' : '#D7261E',
              border: 'none', borderRadius: 5, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              color: '#fff', flexShrink: 0,
            }}
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
