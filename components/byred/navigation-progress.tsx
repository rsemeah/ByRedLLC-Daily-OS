"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const TRICKLE_INTERVAL = 400
const TRICKLE_AMOUNT = 0.025
const FINISH_DURATION = 200

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevKey = useRef("")

  const cleanup = useCallback(() => {
    if (trickleRef.current) clearInterval(trickleRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    trickleRef.current = null
    hideRef.current = null
  }, [])

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`

    if (prevKey.current === "") {
      prevKey.current = key
      return
    }

    if (key === prevKey.current) return
    prevKey.current = key

    cleanup()
    setProgress(0.15)
    setVisible(true)

    trickleRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 0.95) return p
        return p + TRICKLE_AMOUNT * (1 - p)
      })
    }, TRICKLE_INTERVAL)

    const finishTimer = setTimeout(() => {
      if (trickleRef.current) clearInterval(trickleRef.current)
      trickleRef.current = null
      setProgress(1)
      hideRef.current = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, FINISH_DURATION)
    }, 50)

    return () => {
      clearTimeout(finishTimer)
      cleanup()
    }
  }, [pathname, searchParams, cleanup])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      <div
        className="h-full origin-left bg-byred-red transition-transform ease-out"
        style={{
          transform: `scaleX(${progress})`,
          transitionDuration: progress === 1 ? `${FINISH_DURATION}ms` : "300ms",
          opacity: visible ? 1 : 0,
        }}
      />
      {visible && progress < 1 && (
        <div
          className="absolute right-0 top-0 h-full w-24 -translate-x-px bg-gradient-to-l from-byred-red/60 to-transparent"
          style={{ transform: `translateX(${progress * 100}%)` }}
        />
      )}
    </div>
  )
}
