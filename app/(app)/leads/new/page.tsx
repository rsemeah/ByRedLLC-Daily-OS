'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useUser } from '@/lib/context/user-context'
import { syncActiveTenantForMutation } from '@/lib/client/sync-active-tenant'
import { createLeadAction } from '@/lib/actions/leads'

export default function NewLeadPage() {
  const router = useRouter()
  const { tenants, activeTenantId, setActiveTenantId } = useUser()
  const defaultTenantId = activeTenantId ?? tenants[0]?.id ?? ''
  const [loading, setLoading] = useState(false)

  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    setTenantId((prev) => (prev ? prev : defaultTenantId))
  }, [defaultTenantId])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [revenuePotential, setRevenuePotential] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !name) {
      toast.error('Tenant and name are required.')
      return
    }
    setLoading(true)
    try {
      await syncActiveTenantForMutation(setActiveTenantId, activeTenantId, tenantId)
      const rawRev = revenuePotential.trim()
      const parsed =
        rawRev === '' ? null : Number.parseFloat(rawRev)
      const revenue =
        parsed != null && !Number.isNaN(parsed) ? parsed : null
      const result = await createLeadAction({
        tenantId,
        name,
        phone: phone || undefined,
        email: email || undefined,
        source: source || undefined,
        revenuePotential: revenue,
        notes: notes || undefined,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Lead created.')
      router.push(`/leads/${result.data.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-400" aria-label="Breadcrumb">
        <Link href="/leads" className="hover:text-zinc-700 transition-colors">Leads</Link>
        <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
        <span className="text-zinc-500">New lead</span>
      </nav>

      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">New lead</h1>
        <p className="text-sm text-zinc-500 mt-1">Stage defaults to NEW.</p>
      </div>

      <Card className="bg-white border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-sm font-medium text-zinc-600">Lead details</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant" className="text-xs text-zinc-500">
                Tenant <span className="text-byred-red">*</span>
              </Label>
              {tenants.length === 0 && (
                <p className="text-xs text-amber-700">
                  You don&apos;t have access to any tenants yet. Ask an admin to add you to a workspace.
                </p>
              )}
              <Select
                value={tenantId}
                onValueChange={setTenantId}
                required
                disabled={tenants.length === 0}
              >
                <SelectTrigger
                  id="tenant"
                  className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red"
                >
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-600 text-sm">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-zinc-500">
                Name <span className="text-byred-red">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="Acme Corp — portfolio"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-zinc-500">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="619-555-0100"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-zinc-500">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="contact@example.com"
              />
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-xs text-zinc-500">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="Referral, cold outreach, etc."
                list="source-suggestions"
              />
            </div>

            {/* Revenue potential */}
            <div className="space-y-1.5">
              <Label htmlFor="revenue" className="text-xs text-zinc-500">Revenue potential</Label>
              <Input
                id="revenue"
                type="number"
                min="0"
                value={revenuePotential}
                onChange={(e) => setRevenuePotential(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="38400"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs text-zinc-500">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red min-h-[80px]"
                placeholder="First contact context, additional details…"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-byred-red hover:bg-byred-red-hot text-white"
              >
                {loading ? 'Creating…' : 'Create lead'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-700"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
