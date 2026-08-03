'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, Check, X, Clock } from 'lucide-react'

export const KPI = ({
  title, value, hint, icon: Icon, color = 'from-green-500 to-emerald-500',
}: { title: string; value: string | number; hint?: string; icon: LucideIcon; color?: string }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1 capitalize">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br shrink-0', color)}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
      <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r', color)} />
    </CardContent>
  </Card>
)

export const SectionCard = ({
  title, description, icon: Icon, accent, action, children,
}: { title: string; description?: string; icon?: LucideIcon; accent?: string; action?: ReactNode; children: ReactNode }) => (
  <Card className="overflow-hidden">
    <CardHeader className="border-b border-border/50 flex flex-row items-start justify-between gap-4 space-y-0">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn('p-2 rounded-xl bg-gradient-to-br shrink-0', accent ?? 'from-green-500 to-emerald-500')}>
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </CardHeader>
    <CardContent className="p-5">{children}</CardContent>
  </Card>
)

const pillColors: Record<string, string> = {
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  red: 'bg-destructive/10 text-destructive border-destructive/20',
  gray: 'bg-muted text-muted-foreground border-border',
}

export const StatusPill = ({ label, tone = 'gray', icon: Icon }: { label: string; tone?: keyof typeof pillColors; icon?: LucideIcon }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', pillColors[tone])}>
    {Icon && <Icon className="h-3 w-3" />}
    {label}
  </span>
)

export const FieldReviewBadge = ({ state }: { state: 'PENDING' | 'APPROVED' | 'REJECTED' }) => {
  if (state === 'APPROVED') return <StatusPill label="Approved" tone="green" icon={Check} />
  if (state === 'REJECTED') return <StatusPill label="Rejected" tone="red" icon={X} />
  return <StatusPill label="Pending" tone="amber" icon={Clock} />
}

export const Timeline = ({ items }: { items: { at: string; label: string; by?: string; tone?: 'red' | 'amber' | 'green' }[] }) => (
  <ol className="relative border-l border-border/60 ml-2 space-y-4">
    {items.map((item, i) => (
      <li key={i} className="pl-6 relative">
        <span className={cn(
          'absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-background',
          item.tone === 'red' ? 'bg-destructive' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'green' ? 'bg-green-500' : 'bg-primary',
        )} />
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(item.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {item.by && ` · ${item.by}`}
        </p>
      </li>
    ))}
  </ol>
)

export const EmptyState = ({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) => (
  <div className="text-center py-12">
    <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="mt-4 font-medium">{title}</p>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)