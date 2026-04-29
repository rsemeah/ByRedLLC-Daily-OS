'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type FormState = {
  tenant_id: string
  title: string
  description: string
  priority: string
  status: string
  due_date: string
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical']
const STATUS_OPTIONS = ['not_started', 'in_progress', 'blocked']

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#18181B',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 4,
  padding: '8px 12px',
  fontSize: 13,
  color: '#FAFAFA',
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: '#52525B',
  textTransform: 'uppercase',
  marginBottom: 6,
  display: 'block',
}

export default function OsTaskNewPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    tenant_id: '',
    title: '',
    description: '',
    priority: 'medium',
    status: 'not_started',
    due_date: '',
  })

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/os/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: form.tenant_id || undefined,
            title: form.title.trim(),
            description: form.description.trim() || null,
            priority: form.priority,
            status: form.status,
            due_date: form.due_date || null,
          }),
        })
        const json = await res.json() as { task?: { id: string }; error?: string }
        if (!res.ok || json.error) {
          setError(json.error ?? 'Failed to create task.')
          return
        }
        if (json.task?.id) {
          router.push(`/os/tasks/${json.task.id}`)
        } else {
          router.push('/os/tasks')
        }
      } catch {
        setError('Network error. Try again.')
      }
    })
  }

  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: 560 }}>
      <button
        onClick={() => router.back()}
        style={{
          fontSize: 11,
          color: '#52525B',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 24 }}>
        New Task
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <div>
          <label style={LABEL_STYLE}>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="What needs to be done?"
            style={INPUT_STYLE}
            autoFocus
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={LABEL_STYLE}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Add context, links, or notes…"
            rows={4}
            style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Priority + Status row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={LABEL_STYLE}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p} style={{ background: '#18181B' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} style={{ background: '#18181B' }}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label style={LABEL_STYLE}>Due date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)}
            style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 12, color: '#D7261E', margin: 0 }}>{error}</p>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: '#D7261E',
              color: '#FAFAFA',
              border: 'none',
              borderRadius: 4,
              padding: '0 24px',
              height: 36,
              fontSize: 12,
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Creating…' : 'Create Task'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              color: '#71717A',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 4,
              padding: '0 24px',
              height: 36,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
