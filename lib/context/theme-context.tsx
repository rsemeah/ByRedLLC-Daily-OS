"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  // On mount, read persisted preference (default: dark)
  useEffect(() => {
    const saved = localStorage.getItem("byred_theme") as Theme | null
    const preferred = saved ?? "dark"
    setThemeState(preferred)
    applyTheme(preferred)
  }, [])

  function applyTheme(t: Theme) {
    const html = document.documentElement
    if (t === "dark") {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem("byred_theme", t)
  }

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
