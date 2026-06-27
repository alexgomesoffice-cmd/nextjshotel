'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HelpCircle, XCircle, Phone,
  FileText, Shield, Cookie, Scale, Info, Building
} from 'lucide-react'
import { cn } from '@/lib/utils'

const groups = [
  {
    title: 'Support',
    links: [
      { label: 'Help Center',  href: '/help',         icon: HelpCircle },
      { label: 'Cancellation', href: '/cancellation', icon: XCircle },
      { label: 'Contact Us',   href: '/contact',      icon: Phone },
      { label: 'Register Your Property', href: '/register-property', icon: Building },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms',    icon: FileText },
      { label: 'Privacy Policy',   href: '/privacy',  icon: Shield },
      { label: 'Cookie Policy',    href: '/cookies',  icon: Cookie },
      { label: 'Licenses',         href: '/licenses', icon: Scale },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about', icon: Info },
    ],
  },
]

export default function InfoSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6">
      {groups.map(({ title, links }) => (
        <div key={title}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            {title}
          </p>
          <ul className="space-y-1">
            {links.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                    pathname === href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}