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
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none">
      <div
        className="h-full bg-brand-red transition-all ease-out"
        style={{
          width: `${progress * 100}%`,
          transitionDuration: progress === 1 ? `${FINISH_DURATION}ms` : "300ms",
          opacity: visible ? 1 : 0,
        }}
      />
      {visible && progress < 1 && (
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-brand-red/0 to-brand-red" />
      )}
    </div>
  )
}
