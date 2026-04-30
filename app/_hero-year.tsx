"use client"

import { useState, useEffect } from "react"

export default function HeroYear() {
  const [year, setYear] = useState<number | null>(null)
  useEffect(() => { setYear(new Date().getFullYear()) }, [])
  return <>{year ?? "—"}</>
}
