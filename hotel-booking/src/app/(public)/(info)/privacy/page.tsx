import { Shield } from 'lucide-react'

export const metadata = { title: 'Privacy Policy | GhuriBangla' }

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </div>
      </div>

      {[
        {
          title: 'Information We Collect',
          body: 'We collect information you provide when creating an account (name, email, phone), making a booking (travel dates, guest count), and using our services (device type, IP address, pages visited).',
        },
        {
          title: 'How We Use Your Data',
          body: 'Your data is used to process bookings, send confirmation emails, provide customer support, and improve our platform. We do not sell your personal data to third parties.',
        },
        {
          title: 'Data Sharing',
          body: 'Booking details are shared with the relevant hotel to fulfil your reservation. We may share data with payment processors under strict data processing agreements.',
        },
        {
          title: 'Your Rights',
          body: 'You may request access to, correction of, or deletion of your personal data at any time by contacting us at support@ghuribangla.com.',
        },
        {
          title: 'Cookies',
          body: 'We use cookies to maintain your session and improve your experience. See our Cookie Policy for full details.',
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