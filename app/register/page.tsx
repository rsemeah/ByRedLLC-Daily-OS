import { AuthShell } from "@/components/byred/auth-shell"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm overflow-hidden">
          <div className="px-6 pt-5 pb-2 border-b border-white/6 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
              Request Access
            </span>
            <span className="text-[10px] font-mono text-white/20">Allowlist gated</span>
          </div>

          <div className="px-6 py-8 text-center">
            <p className="text-sm text-white/50 leading-relaxed">
              Access to By Red OS is by invitation only.
            </p>
            <p className="mt-2 text-sm text-white/40 leading-relaxed">
              Contact your administrator to be added to the allowlist.
            </p>
          </div>

          <div className="px-6 pb-5">
            <Link
              href="/login"
              className="w-full h-9 flex items-center justify-center gap-2 rounded-md border border-white/10 text-white/50 text-sm hover:text-white/80 hover:border-white/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}
