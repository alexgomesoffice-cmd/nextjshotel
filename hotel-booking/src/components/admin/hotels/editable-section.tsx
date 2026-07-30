'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface EditableField {
  key: string
  label: string
  value: string | number | null
  type?: 'text' | 'number' | 'email' | 'date'
  editable?: boolean // default true; set false for e.g. locked email
}

export function EditableSection({
  title,
  fields,
  onSave,
}: {
  title: string
  fields: EditableField[]
  onSave: (changes: Record<string, string>) => Promise<{ success: boolean; message?: string }>
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openDialog = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value == null ? '' : String(f.value)])))
    setError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const result = await onSave(values)
    setSaving(false)
    if (!result.success) {
      setError(result.message || 'Something went wrong.')
      return
    }
    setOpen(false)
  }

  return (
    <section className="rounded-md border border-border/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openDialog}>
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {fields.map((f) => (
          <div key={f.key} className="border-b border-border/40 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="text-sm">{f.value ?? '—'}</div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit {title}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? 'text'}
                  value={values[f.key] ?? ''}
                  disabled={f.editable === false}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save (goes live immediately)'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}