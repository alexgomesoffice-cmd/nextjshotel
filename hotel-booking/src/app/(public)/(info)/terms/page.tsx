import { FileText } from 'lucide-react'

export const metadata = { title: 'Terms of Service | GhuriBangla' }

export default function TermsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </div>
      </div>

      {[
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing or using GhuriBangla, you agree to be bound by these Terms of Service and all applicable laws. If you do not agree, please do not use our service.',
        },
        {
          title: '2. Bookings & Payments',
          body: 'All bookings are subject to availability and hotel approval. Prices are in Bangladeshi Taka (BDT) and include applicable taxes unless stated otherwise.',
        },
        {
          title: '3. User Accounts',
          body: 'You are responsible for maintaining the confidentiality of your account credentials. GhuriBangla is not liable for any loss resulting from unauthorised use of your account.',
        },
        {
          title: '4. Cancellations & Refunds',
          body: "Cancellation and refund terms are set by each hotel and displayed before booking confirmation. GhuriBangla facilitates refunds but does not guarantee timelines beyond the hotel's stated policy.",
        },
        {
          title: '5. Changes to Terms',
          body: 'We reserve the right to update these terms at any time. Continued use of the service after changes are posted constitutes acceptance of the updated terms.',
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