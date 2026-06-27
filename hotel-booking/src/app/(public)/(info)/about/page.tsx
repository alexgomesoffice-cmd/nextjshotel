import { Info } from 'lucide-react'

export const metadata = { title: 'About Us | GhuriBangla' }

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">About GhuriBangla</h1>
          <p className="text-sm text-muted-foreground">Our story and mission</p>
        </div>
      </div>

      {[
        {
          title: 'Who We Are',
          body: 'GhuriBangla is a hotel booking platform built for travellers exploring Bangladesh. We connect guests with hotels across the country, making it easy to discover, compare, and book the perfect stay.',
        },
        {
          title: 'Our Mission',
          body: 'We believe travel should be effortless. Our mission is to provide a seamless, transparent, and trustworthy booking experience for every kind of traveller — from weekend getaways to extended business trips.',
        },
        {
          title: 'For Hotels',
          body: 'We partner with properties of all sizes — from boutique guesthouses to large city hotels. If you manage a property and want to list on GhuriBangla, contact us at hotels@ghuribangla.com.',
        },
        {
          title: 'Get in Touch',
          body: 'Have a question or feedback? Visit our Contact Us page or email support@ghuribangla.com. We would love to hear from you.',
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