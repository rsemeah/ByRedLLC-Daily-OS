import { AuthShell } from "@/components/byred/auth-shell"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <>
      <style>{`html, body { background: #050507 !important; }`}</style>
      <AuthShell>
        <LoginForm />
      </AuthShell>
    </>
  )
}
