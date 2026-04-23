/**
 * Next.js runtime instrumentation hook.
 * Runs exactly once per Node process boot. We use it to assert the
 * environment contract so a missing prod-required var fails the boot
 * loudly instead of the first unlucky request.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { assertEnvAtBoot } = await import("@/lib/env")
  assertEnvAtBoot()
}
