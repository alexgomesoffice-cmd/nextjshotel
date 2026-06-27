import { XCircle } from 'lucide-react'

export const metadata = { title: 'Cancellation Policy | GhuriBangla' }

export default function CancellationPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cancellation Policy</h1>
          <p className="text-sm text-muted-foreground">Understanding your cancellation options</p>
        </div>
      </div>

      <section>
        <h2 className="text-base font-semibold mb-2">Flexible</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Full refund if cancelled any time before check-in. No questions asked.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">Moderate</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Partial refund available. The exact percentage depends on how far in advance you
          cancel relative to check-in, as set by the hotel.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">Strict</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No refund on cancellation. Please review the hotel policy carefully before booking.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">Custom</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The hotel sets its own cancellation window and refund percentage. This is always
          displayed clearly on the booking page before you confirm.
        </p>
      </section>

      <div className="p-5 rounded-2xl border border-border/50 bg-secondary/20">
        <h3 className="text-sm font-semibold mb-1">How to cancel</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          My Bookings - select your reservation - Cancel. Eligible refunds are processed
          within 5–10 business days.
        </p>
      </div>
    </div>
  )
}