import { Scale } from 'lucide-react'

export const metadata = { title: 'Licenses | GhuriBangla' }

const sections = [
  {
    title: 'Platform Content',
    body: 'All text, graphics, logos, icons, and other content on GhuriBangla are the property of GhuriBangla or its content partners and are protected under applicable copyright laws. Unauthorised reproduction or distribution is strictly prohibited.',
  },
  {
    title: 'Hotel Content & Images',
    body: 'Hotels and property owners who list on GhuriBangla grant us a non-exclusive, royalty-free licence to display their submitted images, descriptions, and amenity information on our platform for the purpose of marketing their property to potential guests.',
  },
  {
    title: 'Guest Reviews',
    body: 'By submitting a review, guests grant GhuriBangla a perpetual, non-exclusive licence to publish, translate, and display that content across the platform. Reviews must be honest, first-hand, and comply with our content guidelines.',
  },
  {
    title: 'Photography Guidelines',
    body: 'All property images submitted must be owned by the submitting party or accompanied by proof of a valid commercial licence. Images that violate third-party copyright will be removed. GhuriBangla is not liable for images submitted by hotel partners.',
  },
  {
    title: 'Trademarks',
    body: 'GhuriBangla and its logo are registered trademarks. You may not use our name, logo, or branding in any form without prior written permission from our team.',
  },
  {
    title: 'Third-Party Links',
    body: 'Our platform may link to hotel websites and external services. GhuriBangla has no control over and accepts no responsibility for the content, privacy practices, or terms of those third-party sites.',
  },
  {
    title: 'Reporting Infringement',
    body: 'If you believe content on GhuriBangla infringes your copyright or trademark, please contact us at legal@ghuribangla.com with a detailed description of the content in question and your ownership credentials.',
  },
]

export default function LicensesPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
          <p className="text-sm text-muted-foreground">Content, image, and trademark licensing</p>
        </div>
      </div>

      {sections.map(({ title, body }) => (
        <section key={title}>
          <h2 className="text-base font-semibold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </section>
      ))}

      <div className="p-5 rounded-2xl border border-border/50 bg-secondary/20">
        <p className="text-sm text-muted-foreground">
          For all licensing enquiries, contact{' '}
          <a href="mailto:legal@ghuribangla.com" className="text-primary hover:underline">
            legal@ghuribangla.com
          </a>
        </p>
      </div>
    </div>
  )
}