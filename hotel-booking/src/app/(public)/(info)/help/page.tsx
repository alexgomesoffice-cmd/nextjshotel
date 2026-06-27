import { HelpCircle } from 'lucide-react'

export const metadata = { title: 'Help Center | GhuriBangla' }

export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
          <p className="text-sm text-muted-foreground">Find answers to common questions</p>
        </div>
      </div>

      <section>
        <h2 className="text-base font-semibold mb-2">How do I make a booking?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Search for a hotel by destination and dates. Select a room type, pick your preferred
          room, and proceed through checkout. A confirmation email with your booking reference
          will be sent immediately.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">How do I cancel a booking?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Go to My Bookings in your account, find the reservation, and click Cancel. Refund
          eligibility depends on the hotels cancellation policy shown at the time of booking.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">Can I modify my booking?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Direct modifications are not currently supported. Please cancel your existing booking
          and create a new one with your preferred dates or room.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">How do I contact support?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Use the Contact Us page in the sidebar and fill out the form. We respond within
          24 hours on business days.
        </p>
      </section>
    </div>
  )
}