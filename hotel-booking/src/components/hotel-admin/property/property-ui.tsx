'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Hotel, MapPin, Star, CheckCircle2, AlertTriangle, Clock, Lock, Edit3,
  ArrowRight, ClipboardList, Eye, ShieldCheck,
} from 'lucide-react'

/* ---- Row: read-only label/value with pending overlay ---- */
export const Row = ({ label, value, pending }: { label: string; value: React.ReactNode; pending?: string }) => (
  <div className="min-w-0">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-sm font-medium mt-0.5">
      {value || <span className="text-muted-foreground/60">—</span>}
    </div>
    {pending !== undefined && pending !== String(value ?? '') && (
      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
        <ArrowRight className="h-3 w-3" /> {pending}
      </div>
    )}
  </div>
)

/* ---- SectionShell: the card wrapper for each Property tab body ---- */
export const SectionShell = ({
  title, description, icon: Icon, accent, requiresApproval, pendingCount, rejectedCount, editingLocked, isEditing, onEdit, children,
}: {
  title: string
  description: string
  icon: React.ElementType
  accent: string
  requiresApproval?: boolean
  pendingCount: number
  rejectedCount: number
  editingLocked: boolean
  isEditing?: boolean
  onEdit: () => void
  children: React.ReactNode
}) => {
  const status = rejectedCount > 0
    ? { label: `${rejectedCount} Rejected Change${rejectedCount === 1 ? '' : 's'}`, tone: 'red' as const, Icon: AlertTriangle }
    : pendingCount > 0
      ? { label: `${pendingCount} Pending Change${pendingCount === 1 ? '' : 's'}`, tone: 'amber' as const, Icon: Clock }
      : { label: 'LIVE', tone: 'green' as const, Icon: CheckCircle2 }

  const toneClass = {
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    red: 'bg-destructive/10 text-destructive border-destructive/20',
  }[status.tone]

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm h-full">
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-60', accent)} />
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('p-2.5 rounded-xl bg-gradient-to-br shrink-0', accent)}>
              <Icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{title}</p>
                {requiresApproval && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border shrink-0', toneClass)}>
            <status.Icon className="h-3 w-3" /> {status.label}
          </span>
        </div>

        <div className="flex-1">{children}</div>

        {!isEditing && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {editingLocked ? 'Edits unlock after review' : 'Edits are saved as draft'}
            </p>
            <Button variant="outline" size="sm" onClick={onEdit} disabled={editingLocked}>
              {editingLocked ? <><Lock className="h-3.5 w-3.5 mr-1.5" /> Locked</> : <><Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- PropertyHero: top hotel identity card ---- */
export const PropertyHero = ({
  hotel,
  pendingName,
}: {
  hotel: any;
  pendingName?: string;
}) => {
  const stars = Math.round(Number(hotel?.detail?.star_rating ?? 0));
  const status = hotel?.approval_status as string;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-fade-in-up">
      <div className="grid min-h-[250px] md:h-[270px] lg:grid-cols-[42%_58%]">
        {/* Property Image */}
        <div className="relative min-h-[220px] overflow-hidden md:min-h-0">
          {hotel?.images?.[0]?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hotel.images[0].image_url}
              alt={hotel?.name || "Property"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 to-green-700">
              <Hotel className="h-12 w-12 text-white/80" />
            </div>
          )}

          {/* Subtle image overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/25" />

          {/* Image label */}
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              <Hotel className="h-3 w-3" />
              Property
            </span>
          </div>
        </div>

        {/* Property Information */}
        <div className="relative flex min-w-0 flex-col justify-between p-5 sm:p-6 lg:p-7">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/8 blur-3xl" />

          <div className="relative min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Property overview
                  </span>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <h2 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {hotel?.name || "Unnamed Property"}
                  </h2>

                  {stars > 0 && (
                    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-1">
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="shrink-0">
                {status === "PUBLISHED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    LIVE
                  </span>
                ) : status === "SUSPENDED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[10px] font-semibold text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    SUSPENDED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    NOT PUBLISHED
                  </span>
                )}
              </div>
            </div>

            {/* Pending name */}
            {pendingName && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-600">
                <Clock className="h-3 w-3" />
                Pending:
                <span className="font-semibold">{pendingName}</span>
              </div>
            )}

            {/* Description */}
            <p className="mt-3 line-clamp-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
              {hotel?.detail?.description ||
                "No description yet — add one from the General tab."}
            </p>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {hotel?.city?.name ?? "—"}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                <Hotel className="h-3.5 w-3.5 text-emerald-600" />

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {hotel?.hotel_type?.name ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom status line */}
          <div className="relative mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                status === "PUBLISHED"
                  ? "bg-green-500"
                  : status === "SUSPENDED"
                    ? "bg-destructive"
                    : "bg-amber-500"
              }`}
            />

            <p className="truncate text-[11px] text-muted-foreground">
              {status === "PUBLISHED"
                ? "Your property is currently visible to guests."
                : status === "SUSPENDED"
                  ? "Your property is currently suspended."
                  : "Complete your property setup to publish."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- Pending review banner (case is PENDING) ---- */
export const PendingReviewBanner = ({
  fieldCount, submittedAt, onOpen,
}: { fieldCount: number; submittedAt?: string | null; onOpen: () => void }) => (
  <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 animate-fade-in-up">
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base">Pending Review</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Your latest property changes are currently under review by the System Admin. Editing will unlock as soon as a decision is made.
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {fieldCount} field{fieldCount === 1 ? '' : 's'}</span>
            {submittedAt && <span>· Submitted {new Date(submittedAt).toLocaleString()}</span>}
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onOpen}>
        <Eye className="h-4 w-4 mr-2" /> Open Review Case
      </Button>
    </div>
  </div>
)

/* ---- Unsubmitted draft chip (case is DRAFTING) ---- */
export const UnsubmittedBanner = ({
  fieldCount, onOpen,
}: { fieldCount: number; onOpen: () => void }) => (
  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent px-5 py-4 flex items-center justify-between gap-4 flex-wrap animate-fade-in-up">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
        <ClipboardList className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">You have {fieldCount} unsubmitted change{fieldCount === 1 ? '' : 's'}</p>
        <p className="text-xs text-muted-foreground">All edits accumulate into a single draft. Open Draft Center to review and submit when ready.</p>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={onOpen}>
      <ClipboardList className="h-4 w-4 mr-2" /> Draft Center
    </Button>
  </div>
)

/* ---- Rejected-changes banner (last case was REJECTED) ---- */
export const RejectedBanner = ({ fieldCount }: { fieldCount: number }) => (
  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 flex items-center gap-3 animate-fade-in-up">
    <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm font-semibold">{fieldCount} field{fieldCount === 1 ? '' : 's'} rejected in your last submission</p>
      <p className="text-xs text-muted-foreground">Open the affected section to see why, then re-propose your change.</p>
    </div>
  </div>
)

/* ---- Generic field editor: Current -> New ---- */
export type FieldDef = {
  entityType: string
  entityId: number | null
  fieldName: string
  label: string
  currentValue: string
  multiline?: boolean
  type?: 'text' | 'number' | 'date' | 'email'
  step?: string
  min?: string
  max?: string
  locked?: boolean
  helper?: string
}

export const FieldEditor = ({
  field, pending, bufferValue, onChange, disabled,
}: {
  field: FieldDef
  pending?: string
  bufferValue?: string
  onChange: (v: string) => void
  disabled?: boolean
}) => {
  const displayed = bufferValue ?? pending ?? field.currentValue
  const isDirty = displayed !== field.currentValue

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{field.label}</Label>
        {isDirty && !field.locked && (
          <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">Changed</span>
        )}
        {field.locked && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5 inline-flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Current (live)</p>
        <div className="text-sm bg-muted/50 rounded-md px-3 py-2 border border-border/60 min-h-[36px]">
          {field.currentValue || <span className="text-muted-foreground/60">—</span>}
        </div>
      </div>

      {!field.locked && (
        <>
          <div className="flex items-center justify-center py-0.5">
            <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <ArrowRight className="h-3 w-3 rotate-90" />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">New value</p>
            {field.multiline ? (
              <Textarea rows={4} value={displayed} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
            ) : (
              <Input
                type={field.type ?? 'text'}
                step={field.step}
                min={field.min}
                max={field.max}
                value={displayed}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
              />
            )}
            {field.helper && <p className="text-[10px] text-muted-foreground mt-1">{field.helper}</p>}
          </div>
        </>
      )}
      {field.locked && field.helper && (
        <p className="text-[10px] text-muted-foreground">{field.helper}</p>
      )}
    </div>
  )
}