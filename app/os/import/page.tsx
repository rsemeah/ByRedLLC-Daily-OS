'use client'

import { useState, useRef } from 'react'
import { useUser } from '@/lib/context/user-context'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

type PreviewRow = Record<string, string>

const FIELD_MAP: Record<string, string> = {
  title: 'title',
  name: 'title',
  task: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  due_date: 'due_date',
  'due date': 'due_date',
  owner: 'assigned_user_id',
  assignee: 'assigned_user_id',
}

function parseCSV(text: string): PreviewRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: PreviewRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

export default function OsImportPage() {
  const { activeTenantId } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setDone(false)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length > 0) {
        setHeaders(Object.keys(parsed[0]))
        setRows(parsed)
      }
    }
    reader.readAsText(file)
  }

  function getMappedField(header: string): string | null {
    return FIELD_MAP[header.toLowerCase()] ?? null
  }

  async function handleImport() {
    if (!activeTenantId || rows.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const tasks = rows.map((row) => {
        const task: Record<string, string> = { tenant_id: activeTenantId }
        for (const [header, value] of Object.entries(row)) {
          const mapped = getMappedField(header)
          if (mapped) task[mapped] = value
        }
        if (!task.title) task.title = row[headers[0]] ?? 'Untitled'
        return task
      })
      const res = await fetch('/api/os/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      if (!res.ok) throw new Error('Import failed')
      setDone(true)
      setRows([])
      setHeaders([])
      setFileName(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
          Import
        </h1>
        <p style={{ fontSize: 11, color: '#52525B' }}>
          Bulk import tasks from CSV or JSON
        </p>
      </div>

      {done && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 16,
          }}
        >
          <CheckCircle size={14} style={{ color: '#22C55E' }} strokeWidth={2} />
          <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
            Import successful! Tasks have been added to your workspace.
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(215,38,30,0.1)', border: '1px solid rgba(215,38,30,0.3)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 16,
          }}
        >
          <AlertTriangle size={14} style={{ color: '#D7261E' }} strokeWidth={2} />
          <p style={{ fontSize: 12, color: '#D7261E' }}>{error}</p>
        </div>
      )}

      {/* Upload zone */}
      {rows.length === 0 && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: '48px 28px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#18181B',
            marginBottom: 20,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,38,30,0.4)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)')}
        >
          <Upload size={28} style={{ color: '#52525B', marginBottom: 12 }} strokeWidth={1.5} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
            Drop a CSV file or click to browse
          </p>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            Columns: title, description, status, priority, due_date, assignee
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#71717A' }}>
              Preview: <strong style={{ color: '#FAFAFA' }}>{fileName}</strong> · {rows.length} rows
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setRows([]); setHeaders([]); setFileName(null) }}
                style={{ fontSize: 11, color: '#71717A', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={importing}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#FAFAFA', background: importing ? '#52525B' : '#D7261E',
                  border: 'none', borderRadius: 4, padding: '0 16px', height: 30, cursor: importing ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? 'Importing...' : `Import ${rows.length} tasks`}
              </button>
            </div>
          </div>

          {/* Column mapping indicator */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {headers.map((h) => {
              const mapped = getMappedField(h)
              return (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}>
                    {h}
                  </span>
                  <span style={{ fontSize: 10, color: '#3F3F46' }}>→</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: mapped ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', color: mapped ? '#22C55E' : '#52525B' }}>
                    {mapped ?? 'ignored'}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: headers.map(() => '1fr').join(' '),
                padding: '8px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {headers.map((h) => (
                <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>
                  {h}
                </span>
              ))}
            </div>
            {rows.slice(0, 10).map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: headers.map(() => '1fr').join(' '),
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {headers.map((h) => (
                  <span key={h} style={{ fontSize: 11, color: '#D4D4D8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {row[h]}
                  </span>
                ))}
              </div>
            ))}
            {rows.length > 10 && (
              <div style={{ padding: '8px 14px', color: '#52525B', fontSize: 11 }}>
                +{rows.length - 10} more rows not shown
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
