import type { ReactNode } from "react"

type ComingSoonProps = {
  title: string
  description: string
  icon?: ReactNode
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "48px 28px",
        textAlign: "center",
      }}
    >
      {icon && (
        <div style={{ marginBottom: 16, opacity: 0.4 }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 3,
          color: "#D7261E",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Coming Soon
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#FAFAFA",
          letterSpacing: "-0.5px",
          marginBottom: 10,
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 13, color: "#52525B", maxWidth: 380, lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  )
}
