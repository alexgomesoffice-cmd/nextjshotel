// Reusable enterprise UI primitives shared across System Admin pages.
// Ported from the React design's components/admin/ops/primitives.tsx.
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-border/60 bg-secondary/60 px-1 font-mono text-[10px] text-muted-foreground">
    {children}
  </kbd>
)

export const OpsSectionHeader = ({
  title,
  description,
  right,
  className,
}: {
  title: string
  description?: string
  right?: ReactNode
  className?: string
}) => (
  <div className={cn("flex items-end justify-between border-b border-border/60 pb-3", className)}>
    <div>
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
    {right && <div className="flex items-center gap-2">{right}</div>}
  </div>
)

export const OpsTable = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("overflow-x-auto rounded-md border border-border/60 bg-card", className)}>
    <table className="w-full border-collapse text-sm">{children}</table>
  </div>
)

export const OpsTh = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th
    className={cn(
      "sticky top-0 z-10 border-b border-border/60 bg-card px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
      className,
    )}
  >
    {children}
  </th>
)

export const OpsTd = ({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
}) => (
  <td colSpan={colSpan} className={cn("border-b border-border/40 px-3 py-2.5 align-middle", className)}>
    {children}
  </td>
)