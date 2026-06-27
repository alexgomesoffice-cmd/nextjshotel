import { Cookie } from 'lucide-react'

export const metadata = { title: 'Cookie Policy | GhuriBangla' }

export default function CookiePage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Cookie className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </div>
      </div>

      {[
        {
          title: 'What Are Cookies?',
          body: 'Cookies are small text files stored on your device by your browser. They help us recognise you and remember your preferences across visits.',
        },
        {
          title: 'Essential Cookies',
          body: 'These are required for the platform to function — they store your login session and booking flow state. They cannot be disabled.',
        },
        {
          title: 'Analytics Cookies',
          body: 'We use analytics cookies to understand how visitors use our site: which pages are most visited, how long users stay, and where they come from. This data is aggregated and anonymous.',
        },
        {
          title: 'Managing Cookies',
          body: 'You can control cookies through your browser settings. Disabling all cookies may prevent you from logging in or completing a booking.',
        },
      ].map(({ title, body }) => (
        <section key={title}>
          <h2 className="text-base font-semibold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </section>
      ))}
    </div>
  )
}