'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, XCircle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { SEED_USER } from '@/lib/seed'
import { cn } from '@/lib/utils'

const AI_MODES = ['HUMAN_ONLY', 'AI_ASSIST', 'AI_DRAFT', 'AI_EXECUTE'] as const

const INTEGRATION_STATUS = [
  { name: 'Monday.com', connected: false },
  { name: 'Zapier nightly', connected: false },
  { name: 'AI provider', connected: true },
]

export default function SettingsPage() {
  const user = SEED_USER
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [defaultAiMode, setDefaultAiMode] = useState<string>('HUMAN_ONLY')

  function handleProfileSave() {
    toast.success('Profile updated.')
  }

  function handleDefaultsSave() {
    toast.success('Defaults updated.')
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-100 tracking-tight">Settings</h1>
      </div>

      {/* Profile */}
      <section>
        <h2 className="text-sm font-condensed font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Profile
        </h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-xs text-zinc-500">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 focus-visible:ring-byred-red"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-display" className="text-xs text-zinc-500">Email</Label>
              <Input
                id="email-display"
                value={user.email}
                readOnly
                className="bg-zinc-800/50 border-zinc-800 text-zinc-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-zinc-600">Email cannot be changed here.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Role</Label>
              <div className="h-9 px-3 flex items-center rounded-md bg-zinc-800/50 border border-zinc-800">
                <span className="text-sm text-zinc-500 capitalize">{user.role}</span>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-byred-red hover:bg-byred-red-hot text-white"
              onClick={handleProfileSave}
            >
              Save profile
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Defaults */}
      <section>
        <h2 className="text-sm font-condensed font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Defaults
        </h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <p className="text-xs text-zinc-500">Default AI mode for new tasks</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label="Default AI mode">
              {AI_MODES.map((mode) => (
                <label
                  key={mode}
                  className="flex items-start gap-3 cursor-pointer group"
                  htmlFor={`mode-${mode}`}
                >
                  <input
                    id={`mode-${mode}`}
                    type="radio"
                    name="ai-mode"
                    value={mode}
                    checked={defaultAiMode === mode}
                    onChange={() => setDefaultAiMode(mode)}
                    className="mt-0.5 accent-byred-red"
                  />
                  <div>
                    <p className="text-sm text-zinc-300 font-mono">{mode}</p>
                    {mode === 'AI_EXECUTE' && (
                      <div className="flex items-start gap-1.5 mt-1 p-2 rounded-sm bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                        <p className="text-[10px] text-amber-400">
                          AI_EXECUTE runs tasks without confirmation. Use with caution.
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="bg-byred-red hover:bg-byred-red-hot text-white"
              onClick={handleDefaultsSave}
            >
              Save defaults
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Integrations */}
      <section>
        <h2 className="text-sm font-condensed font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Integrations
        </h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {INTEGRATION_STATUS.map((int) => (
              <div key={int.name} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{int.name}</span>
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-sm',
                    int.connected
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  )}
                >
                  {int.connected ? (
                    <CheckCircle className="w-3 h-3" strokeWidth={1.75} />
                  ) : (
                    <XCircle className="w-3 h-3" strokeWidth={1.75} />
                  )}
                  {int.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-condensed font-semibold text-byred-red uppercase tracking-wide mb-3">
          Danger zone
        </h2>
        <Card className="bg-zinc-900 border-byred-red/30">
          <CardContent className="p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 gap-2"
              onClick={() => toast.success('Signed out.')}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
              Sign out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-byred-red/30 text-byred-red hover:bg-byred-red/10 gap-2"
                >
                  <XCircle className="w-4 h-4" strokeWidth={1.75} />
                  Revoke all sessions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-zinc-100">Revoke all sessions?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    All active sessions will be terminated immediately. You will be signed out.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-700 text-zinc-400">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-byred-red hover:bg-byred-red-hot text-white">
                    Revoke all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
