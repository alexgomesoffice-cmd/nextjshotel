import { Scale } from 'lucide-react'

export const metadata = { title: 'Licenses | GhuriBangla' }

const libraries = [
  { name: 'Next.js',      license: 'MIT',       url: 'https://github.com/vercel/next.js' },
  { name: 'React',        license: 'MIT',       url: 'https://github.com/facebook/react' },
  { name: 'Tailwind CSS', license: 'MIT',       url: 'https://github.com/tailwindlabs/tailwindcss' },
  { name: 'Prisma',       license: 'Apache 2.0',url: 'https://github.com/prisma/prisma' },
  { name: 'Lucide React', license: 'ISC',       url: 'https://github.com/lucide-icons/lucide' },
  { name: 'Radix UI',     license: 'MIT',       url: 'https://github.com/radix-ui/primitives' },
  { name: 'Zod',          license: 'MIT',       url: 'https://github.com/colinhacks/zod' },
  { name: 'date-fns',     license: 'MIT',       url: 'https://github.com/date-fns/date-fns' },
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
          <p className="text-sm text-muted-foreground">Open-source libraries we use</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        GhuriBangla is built with the following open-source libraries. We are grateful to their
        authors and contributors.
      </p>

      <div className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
        {libraries.map(({ name, license, url }) => (
          <div key={name} className="flex items-center justify-between px-5 py-3.5 bg-card hover:bg-secondary/20 transition-colors">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {name}
            </a>
            <span className="text-xs bg-secondary/60 border border-border/40 rounded-full px-3 py-1 text-muted-foreground">
              {license}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}