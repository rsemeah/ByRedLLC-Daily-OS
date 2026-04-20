'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight,
  Phone,
  Mail,
  Copy,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Archive,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, isBefore, isValid, format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { TenantPill } from '@/components/byred/tenant-pill'
import { ActivityItem } from '@/components/byred/activity-item'
import { SEED_LEADS, SEED_ACTIVITIES, SEED_USER } from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/db'

const STAGES: Lead['stage'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST']

function formatCurrency(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  const d = parseISO(dateStr)
  return isValid(d) && isBefore(d, new Date())
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const lead = SEED_LEADS.find((l) => l.id === id)
  if (!lead) notFound()

  const activities = SEED_ACTIVITIES.filter(
    (a) => a.object_type === 'lead' && a.object_id === id
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const user = SEED_USER
  const initials = user.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RO'

  const [stage, setStage] = useState<Lead['stage']>(lead.stage)
  const [logNote, setLogNote] = useState('')

  const overdueFollowUp = isOverdue(lead.next_follow_up_at)
  const currentStageIndex = STAGES.indexOf(stage)

  function handleStageClick(newStage: Lead['stage']) {
    setStage(newStage)
    toast.success(`Stage updated to ${newStage}.`)
  }

  function handleLogContact() {
    if (!logNote.trim()) return
    toast.success('Contact logged.')
    setLogNote('')
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied.')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400" aria-label="Breadcrumb">
          <Link href="/leads" className="hover:text-zinc-700 transition-colors">Leads</Link>
          <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
          <span className="text-zinc-500 truncate max-w-[200px]">{lead.name.slice(0, 40)}</span>
        </nav>

        <h1 className="text-2xl font-condensed font-bold text-zinc-800 tracking-tight">{lead.name}</h1>

        {/* Contact card */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                  <a href={`tel:${lead.phone}`} className="text-zinc-600 hover:text-zinc-800 text-xs">
                    {lead.phone}
                  </a>
                  <button onClick={() => copy(lead.phone!)} className="text-zinc-400 hover:text-zinc-600">
                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                  <a href={`mailto:${lead.email}`} className="text-zinc-600 hover:text-zinc-800 text-xs truncate">
                    {lead.email}
                  </a>
                  <button onClick={() => copy(lead.email!)} className="text-zinc-400 hover:text-zinc-600">
                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Source</span>
                <span className="text-xs text-zinc-600">{lead.source ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Tenant</span>
                <TenantPill tenantId={lead.tenant_id} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Owner</span>
                {lead.assigned_user_id ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center">
                      <span className="text-[9px] font-semibold text-byred-red font-condensed">{initials}</span>
                    </div>
                    <span className="text-xs text-zinc-600">{user.full_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">Unassigned</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stage tracker */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Stage</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {STAGES.map((s, i) => {
              const isActive = s === stage
              const isCompleted = i < currentStageIndex
              return (
                <button
                  key={s}
                  onClick={() => handleStageClick(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-byred-red focus-visible:outline-none',
                    isActive ? 'bg-byred-red text-white' : isCompleted ? 'text-zinc-500 bg-zinc-200' : 'text-zinc-400 bg-zinc-100 hover:text-zinc-700 hover:bg-zinc-200'
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Activity timeline */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Activity</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-zinc-400">No activity.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {activities.map((a) => (
                <ActivityItem key={a.id} activity={a} showObject={false} />
              ))}
            </div>
          )}
        </div>

        {/* Log contact */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Log contact</h3>
          <div className="space-y-2">
            <Textarea
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="Describe the contact…"
              className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 text-xs focus-visible:ring-byred-red min-h-[80px]"
            />
            <Button
              size="sm"
              className="bg-byred-red hover:bg-byred-red-hot text-white"
              onClick={handleLogContact}
              disabled={!logNote.trim()}
            >
              Log contact
            </Button>
          </div>
        </div>
      </div>

      {/* Right: sticky sidebar */}
      <div className="space-y-4 lg:sticky lg:top-20 self-start">
        {/* Revenue block */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              <p className="text-3xl font-condensed font-bold text-emerald-600">
                {formatCurrency(lead.revenue_potential)}
              </p>
            </div>
            <p className="text-xs text-zinc-400">potential</p>
          </CardContent>
        </Card>

        {/* Follow-up */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-condensed font-semibold text-zinc-600 uppercase tracking-wide">
              Follow-up
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.next_follow_up_at && (
              <div className={cn('flex items-center gap-2', overdueFollowUp && 'text-byred-red')}>
                {overdueFollowUp && <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
                <span className="text-xs font-mono">
                  {format(parseISO(lead.next_follow_up_at), 'MMM d, h:mm a')}
                </span>
                {overdueFollowUp && <span className="text-xs text-byred-red">Overdue</span>}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-xs gap-2"
              onClick={() => toast.success('Marked as contacted.')}
            >
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
              Mark contacted
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-xs gap-2"
              onClick={() => toast.success('Follow-up scheduled.')}
            >
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
              Set follow-up
            </Button>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-condensed font-semibold text-zinc-600 uppercase tracking-wide">
              Quick actions
            </h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-xs gap-2"
              onClick={() => toast.success('Task created from lead.')}
            >
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
              Convert to task
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-xs gap-2"
              onClick={() => toast.success('Lead reassigned.')}
            >
              <UserCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
              Reassign
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-200 text-zinc-400 hover:text-byred-red hover:border-byred-red/30 text-xs gap-2"
                >
                  <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white border-zinc-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-zinc-800">Archive this lead?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-500">
                    This will move the lead to LOST. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-300 text-zinc-500">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-byred-red hover:bg-byred-red-hot text-white"
                    onClick={() => {
                      setStage('LOST')
                      toast.success('Lead archived.')
                    }}
                  >
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
