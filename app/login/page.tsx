import { AuthShell } from "@/components/byred/auth-shell"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  )
}
