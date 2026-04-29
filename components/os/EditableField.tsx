"use client"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"

type EditableFieldProps = {
  value: string
  onSave: (next: string) => Promise<void> | void
  multiline?: boolean
  placeholder?: string
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
}

export function EditableField({
  value,
  onSave,
  multiline = false,
  placeholder = "—",
  style,
  className,
  disabled = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  // Keep draft in sync when value prop changes externally
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function commit() {
    const trimmed = draft.trim()
    if (trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed || value)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      void commit()
    }
    if (e.key === "Enter" && multiline && e.metaKey) {
      e.preventDefault()
      void commit()
    }
    if (e.key === "Escape") cancel()
  }

  const baseStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#D4D4D8",
    background: "transparent",
    border: "none",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    lineHeight: 1.45,
    padding: 0,
    ...style,
  }

  if (editing) {
    const Tag = multiline ? "textarea" : "input"
    return (
      <Tag
        ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleKeyDown}
        disabled={saving}
        rows={multiline ? 3 : undefined}
        style={{
          ...baseStyle,
          color: "#FAFAFA",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 3,
          padding: "2px 6px",
          resize: multiline ? "vertical" : "none",
          opacity: saving ? 0.5 : 1,
        }}
        className={className}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setEditing(true)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) setEditing(true)
      }}
      className={className}
      style={{
        ...baseStyle,
        display: "block",
        cursor: disabled ? "default" : "text",
        borderBottom: disabled ? "none" : "1px solid transparent",
        paddingBottom: 1,
        color: value ? "#D4D4D8" : "#3F3F46",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.borderBottomColor = "rgba(255,255,255,0.15)"
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent"
      }}
    >
      {value || placeholder}
    </span>
  )
}
