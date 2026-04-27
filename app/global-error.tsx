"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f7f7f7",
          color: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 24px",
              borderRadius: "50%",
              background: "#fde8e8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}
          >
            Critical error
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#71717a",
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            {error.message || "The application could not recover. Try reloading."}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#a1a1aa",
                fontFamily: "monospace",
                margin: "0 0 24px",
              }}
            >
              Ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              background: "#D02C2A",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 24px",
              borderRadius: 4,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Reload
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: global-error renders outside the router */}
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              fontSize: 14,
              fontWeight: 500,
              color: "#71717a",
              textDecoration: "underline",
              padding: "10px 12px",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  )
}
