const isProd = process.env.NODE_ENV === "production"
// v0.app previews run with a non-standard NODE_ENV which triggers isProd=true
// even in a preview/dev context. VERCEL_ENV distinguishes real production
// from preview/development deployments on Vercel infrastructure.
const isRealProd = isProd && process.env.VERCEL_ENV === "production"

// Hosts the app actually talks to from the browser. Everything else is
// refused by CSP, so a compromised chunk can't exfiltrate to an attacker.
const CONNECT_SOURCES = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.monday.com",
  "https://api.resend.com",
]

// In dev Turbopack needs `unsafe-eval` for HMR and inline script/style.
// In prod we still allow `unsafe-inline` for now (shadcn + Tailwind emit
// inline <style>). Tighten to a nonce when we wire nonce middleware.
// unsafe-eval is required in dev/preview for React HMR and v0.app preview rendering
const SCRIPT_SRC = isRealProd
  ? ["'self'", "'unsafe-inline'"]
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'"]

const CSP_DIRECTIVES = [
  ["default-src", ["'self'"]],
  ["script-src", SCRIPT_SRC],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["img-src", ["'self'", "data:", "blob:", "https:"]],
  ["font-src", ["'self'", "data:"]],
  ["connect-src", CONNECT_SOURCES],
  ["frame-ancestors", ["'none'"]],
  ["frame-src", ["'none'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'self'"]],
  ["worker-src", ["'self'", "blob:"]],
  ["manifest-src", ["'self'"]],
]

const CSP =
  CSP_DIRECTIVES.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ") +
  (isRealProd ? "; upgrade-insecure-requests" : "")

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=(self)",
  "screen-wake-lock=()",
  "sync-xhr=(self)",
  "usb=()",
  "xr-spatial-tracking=()",
  "interest-cohort=()",
].join(", ")

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
]

// HSTS only in real production. Don't pin dev tunnels or v0 preview deployments.
if (isRealProd) {
  SECURITY_HEADERS.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Do not leak the framework in response headers. Version disclosure is a
  // free reconnaissance signal for attackers.
  poweredByHeader: false,
  // Next 16 blocks dev resources from non-localhost origins unless explicitly
  // listed. Without this the app appears unreachable when fronted by a
  // cloudflared / ngrok tunnel. Wildcards so URLs can rotate.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
