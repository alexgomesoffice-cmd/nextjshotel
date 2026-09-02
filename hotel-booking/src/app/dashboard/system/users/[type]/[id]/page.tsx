'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Clock3,
  UserRound,
  Building2,
  Ban,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

import { EditableSection } from '@/components/admin/hotels/editable-section'
import { Button } from '@/components/ui/button'

const TYPE_LABEL: Record<string, string> = {
  'end-user': 'User',
  'hotel-admin': 'Hotel Admin',
  'hotel-sub-admin': 'Hotel Sub Admin',
}

function getInitials(name?: string) {
  if (!name) return 'U'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function UserDetailPage() {
  const params = useParams<{ type: string; id: string }>()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)

    fetch(`/api/system-admin/users/${params.type}/${params.id}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setUser(d?.data ?? null))
      .finally(() => setLoading(false))
  }, [params.type, params.id])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/system-admin/users/${params.type}/${params.id}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )

    const data = await res.json()

    if (data.success) {
      load()
    }

    return data
  }

  const toggleBlock = async () => {
    if (!user || blocking) return

    setBlocking(true)

    try {
      await patch({
        is_blocked: !user.is_blocked,
      })
    } finally {
      setBlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 rounded bg-secondary" />

          <div className="h-32 rounded-xl border border-border/60 bg-card" />

          <div className="h-72 rounded-xl border border-border/60 bg-card" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-border/60 bg-card p-10 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

          <h2 className="text-sm font-semibold text-foreground">
            User not found
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            The user you are looking for may have been removed or does not
            exist.
          </p>
        </div>
      </div>
    )
  }

  const emailLocked = params.type === 'hotel-admin'
  const roleLabel = TYPE_LABEL[params.type] ?? params.type

  const isBlocked = Boolean(user.is_blocked)
  const isActive = Boolean(user.is_active)

  const statusLabel = isBlocked
    ? 'Blocked'
    : isActive
      ? 'Active'
      : 'Inactive'

  const statusClass = isBlocked
    ? 'border-red-500/20 bg-red-500/10 text-red-400'
    : isActive
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-400'

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-6xl px-6 py-7 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="group inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Users
          </button>

          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

          <span className="font-medium text-foreground">
            {user.name}
          </span>
        </div>

        {/* Profile header */}
        <section className="rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-lg font-semibold text-blue-400">
                {getInitials(user.name)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {user.name}
                  </h1>

                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      statusClass,
                    ].join(' ')}
                  >
                    {isBlocked ? (
                      <Ban className="h-3 w-3" />
                    ) : isActive ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock3 className="h-3 w-3" />
                    )}

                    {statusLabel}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>{roleLabel}</span>

                  {user.hotel?.name && (
                    <>
                      <span className="text-border">•</span>

                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {user.hotel.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header action */}
            <div className="flex shrink-0 items-center">
              <Button
                size="sm"
                variant={isBlocked ? 'default' : 'destructive'}
                className="h-9 min-w-[100px]"
                disabled={blocking}
                onClick={toggleBlock}
              >
                {blocking
                  ? 'Updating…'
                  : isBlocked
                    ? 'Unblock User'
                    : 'Block User'}
              </Button>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Left column */}
          <div className="min-w-0 space-y-6">
            {/* Personal information */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <UserRound className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Personal information
                    </h2>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Basic contact and identity information
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <EditableSection
                  title=""
                  fields={[
                    {
                      key: 'name',
                      label: 'Full name',
                      value: user.name,
                    },
                    {
                      key: 'email',
                      label: emailLocked
                        ? 'Email address · Locked'
                        : 'Email address',
                      value: user.email,
                      type: 'email',
                      editable: !emailLocked,
                    },
                    {
                      key: 'phone',
                      label: 'Phone number',
                      value: user.detail?.phone ?? null,
                    },
                    {
                      key: 'address',
                      label: 'Address',
                      value: user.detail?.address ?? null,
                    },
                  ]}
                  onSave={patch}
                />
              </div>
            </div>

            {/* Contact details */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                    <Mail className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Contact details
                    </h2>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Information available for this account
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y divide-border/50 md:grid-cols-2 md:divide-x md:divide-y-0">
                {/* Email */}
                <div className="flex items-start gap-3 px-6 py-5">
                  <div className="mt-0.5 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Email
                    </p>

                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {user.email || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 px-6 py-5">
                  <div className="mt-0.5 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Phone
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.detail?.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 border-t border-border/50 px-6 py-5 md:col-span-2">
                  <div className="mt-0.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Address
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.detail?.address || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Account */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/50 px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Account
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Current account state
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Status
                  </span>

                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      statusClass,
                    ].join(' ')}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="my-4 h-px bg-border/50" />

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Last login
                  </span>

                  <span className="text-right text-sm font-medium text-foreground">
                    {formatDate(user.last_login_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Access */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />

                  <h2 className="text-sm font-semibold text-foreground">
                    Access
                  </h2>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Account type
                  </p>

                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {roleLabel}
                  </p>
                </div>

                {user.hotel?.name && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Assigned hotel
                    </p>

                    <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {user.hotel.name}
                    </div>
                  </div>
                )}

                {emailLocked && (
                  <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
                    <p className="text-xs leading-5 text-amber-300/80">
                      Email address is managed by the hotel administrator and
                      cannot be changed here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Account control */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.025]">
              <div className="border-b border-red-500/10 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Ban className="h-4 w-4 text-red-400" />

                  <h2 className="text-sm font-semibold text-red-400">
                    Account control
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs leading-5 text-muted-foreground">
                  {isBlocked
                    ? 'This account is currently blocked. Unblocking will allow the user to access the platform again.'
                    : 'Blocking this account will prevent the user from accessing the platform.'}
                </p>

                <Button
                  variant={isBlocked ? 'default' : 'destructive'}
                  size="sm"
                  className="mt-4 w-full"
                  disabled={blocking}
                  onClick={toggleBlock}
                >
                  {blocking
                    ? 'Updating…'
                    : isBlocked
                      ? 'Unblock Account'
                      : 'Block Account'}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}