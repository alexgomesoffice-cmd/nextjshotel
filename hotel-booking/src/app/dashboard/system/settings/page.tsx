'use client'

import {
  Settings, Shield, Clock, Database, Key, Globe, AlertTriangle,
  CheckCircle2, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const CONFIG_ITEMS = [
  {
    section: 'Authentication',
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    items: [
      { label: 'Max Login Attempts', value: '5', description: 'Account locks after 5 consecutive failed login attempts' },
      { label: 'Lock Duration', value: '15 minutes', description: 'How long an account stays locked after hitting the attempt limit' },
      { label: 'JWT Token Expiry', value: '7 days', description: 'Session tokens expire after 7 days of inactivity' },
      { label: 'Token Storage', value: 'HttpOnly Cookie', description: 'Tokens are stored as secure HttpOnly cookies — not localStorage' },
    ],
  },
  {
    section: 'Booking',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    items: [
      { label: 'Reservation Hold Window', value: '10 minutes', description: 'Rooms are held for 10 minutes after a reservation before auto-expiring' },
      { label: 'Advance Deposit', value: 'Per hotel config', description: 'Set per hotel as advance_deposit_percent in hotel_details' },
      { label: 'Pricing Resolution', value: 'Rule → Room Price', description: 'pricing_rules override room_details.price; room_types.base_price is display-only' },
      { label: 'Booking Reference Format', value: 'HBD-YYYYMMDD-XXXX', description: 'Generated at reservation time (not at payment)' },
    ],
  },
  {
    section: 'Platform',
    icon: Globe,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    items: [
      { label: 'Target Market', value: 'Bangladesh', description: 'Platform is localised for BD — BDT currency, BD cities seeded' },
      { label: 'Currency', value: 'BDT (৳)', description: 'All prices displayed in Bangladeshi Taka' },
      { label: 'Default Check-in', value: '14:00', description: 'Default check-in time applied to new hotels' },
      { label: 'Default Check-out', value: '12:00', description: 'Default check-out time applied to new hotels' },
    ],
  },
  {
    section: 'Database',
    icon: Database,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    items: [
      { label: 'ORM', value: 'Prisma 7 (MariaDB adapter)', description: 'Driver adapters required for MariaDB compatibility' },
      { label: 'Soft Deletion', value: 'deleted_at timestamp', description: 'All critical records use soft delete — no hard deletes in normal flow' },
      { label: 'Pool Limit', value: '10 connections', description: 'MariaDB connection pool limit defined in prisma.ts' },
      { label: 'Connect Timeout', value: '10 000 ms', description: 'Pool timeout before connection error is thrown' },
    ],
  },
  {
    section: 'Security',
    icon: Key,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    items: [
      { label: 'Password Hashing', value: 'bcrypt (cost 10)', description: 'All passwords hashed with bcryptjs at cost factor 10' },
      { label: 'Token Blacklist', value: 'blacklisted_tokens table', description: 'Revoked tokens stored in DB; checked on every protected request' },
      { label: 'Google OAuth', value: 'Deferred', description: 'Planned post-launch; end_users.password is nullable to support it' },
      { label: 'Route Protection', value: 'Next.js Middleware + requireAuth', description: 'Middleware does fast JWT check; API routes do full blacklist check' },
    ],
  },
]

const ROLES = [
  { role: 'System Admin', access: ['Manage hotels', 'Manage users', 'Manage cities/types/amenities', 'Create system admins'], color: 'bg-red-500/20 text-red-700 border-red-500/30' },
  { role: 'Hotel Admin', access: ['Manage own hotel info', 'Manage room types & rooms', 'Manage staff', 'View bookings', 'Set pricing rules'], color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  { role: 'Hotel Sub Admin', access: ['Add/edit physical rooms', 'Manage bookings (check-in/out)', 'View guests'], color: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  { role: 'End User', access: ['Browse hotels', 'Make reservations', 'Manage own bookings'], color: 'bg-green-500/20 text-green-700 border-green-500/30' },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">System configuration reference and role permissions</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2 text-sm">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Read-only — config is set via environment variables</span>
        </div>
      </div>

      {/* Config Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CONFIG_ITEMS.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.section} className="glass-strong animate-fade-in-up">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${section.bg}`}>
                    <Icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  {section.section}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {item.value}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Role Matrix */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Role & Permission Matrix
          </CardTitle>
          <CardDescription>What each actor type can do on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <Badge variant="outline" className={r.color}>{r.role}</Badge>
                <ul className="space-y-1.5">
                  {r.access.map((perm, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deferred Features */}
      <Card className="glass-strong border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Deferred Features
          </CardTitle>
          <CardDescription>Planned but not yet implemented in this build phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              'Payment Gateway', 'Email Notifications', 'SMS Notifications',
              'Google OAuth', 'Review System', 'Analytics Dashboard',
              'Revenue Reports', 'Audit Logs',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
