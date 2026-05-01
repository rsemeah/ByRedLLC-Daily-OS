'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isTextUIPart } from 'ai'
import { Send } from 'lucide-react'

const SUGGESTIONS = [
  'What are the highest-priority blockers right now?',
  'Summarize open tasks by tenant',
  'What should I focus on today?',
  'Which projects are at risk?',
]

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

// ai v6: create transport once outside the component
const transport = new DefaultChatTransport({ api: '/api/os/lantern-ai' })

export default function LanternAIPage() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // ai v6 useChat API: sendMessage, status, messages (UIMessage[])
  const { messages, sendMessage, status, error } = useChat({ transport })

  const isActive = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isActive) return
    setInput('')
    sendMessage({ text })
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
          <p style={{ fontSize: 11, color: '#52525B' }}>Your intelligent operations assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', scrollbarWidth: 'none', minHeight: 0 }}>
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
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  style={{
                    fontSize: 11,
                    color: '#A1A1AA',
                    background: '#18181B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,38,30,0.4)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          // ai v6: content lives in message.parts — extract text parts
          const text = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
          const isStreamingThis =
            isActive && m.role === 'assistant' && m.id === messages[messages.length - 1]?.id

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#D7261E' : '#18181B',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  fontSize: 13,
                  color: '#FAFAFA',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
                {isStreamingThis && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 3,
                      height: 14,
                      marginLeft: 3,
                      background: '#71717A',
                      verticalAlign: 'middle',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Thinking — between user send and first assistant token */}
        {isActive && messages[messages.length - 1]?.role === 'user' && (
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

        {error && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#D7261E' }}>
            Something went wrong. Try again.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 28px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <form
          onSubmit={handleSubmit}
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
            disabled={isActive}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FAFAFA',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            title="Send message"
            disabled={isActive || !input.trim()}
            style={{
              width: 30,
              height: 30,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive || !input.trim() ? 'rgba(255,255,255,0.06)' : '#D7261E',
              border: 'none',
              borderRadius: 5,
              cursor: isActive || !input.trim() ? 'not-allowed' : 'pointer',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  )
}
