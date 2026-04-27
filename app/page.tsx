import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function HeroPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      <Image
        src="/hero/byred-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={90}
        className="object-cover object-center"
      />

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/85 pointer-events-none"
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-4 pb-20">
        <div className="flex flex-col items-center gap-7">
          <h1 className="max-w-2xl text-center text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Internal Operations.{" "}
            <span className="text-[#c8102e]">Execution Only.</span>
          </h1>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 rounded-lg bg-[#c8102e] px-8 py-3.5 text-sm font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-red-900/30 transition hover:bg-[#a30d25] hover:shadow-red-900/50"
          >
            Enter
            <ArrowRight
              size={16}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <p className="absolute bottom-6 text-[9px] uppercase tracking-[0.3em] text-white/30">
          By Red, LLC &middot; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}
