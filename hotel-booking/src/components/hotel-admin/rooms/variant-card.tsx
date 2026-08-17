'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MoreVertical, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { ImageManager } from './image-manager'
import { VariantFormDialog } from './variant-form-dialog'

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  BOOKED: 'bg-blue-500',
  CHECKED_IN: 'bg-purple-500',
  CHECKED_OUT: 'bg-slate-400',
  MAINTENANCE: 'bg-amber-500',
}

function variantLabel(v: any): string {
  const beds = v.bed_types.map((b: any) => `${b.count} × ${b.bed_type.name}`).join(', ')
  return beds || 'No beds configured'
}

export const VariantCard = ({
  variant, onEditRoom, onChangeStatus, onAddRoom, onChanged, onDelete,
}: { variant: any; onEditRoom: (roomId: number) => void; onChangeStatus: (roomId: number, status: string) => void; onAddRoom: () => void; onChanged: () => void; onDelete: () => void }) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const cover = variant.variant_images?.find((i: any) => i.is_cover) ?? variant.variant_images?.[0]

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-sm hover:border-border transition-colors">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Top Section: Variant details & image */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {cover ? (
              <div className="relative w-28 h-24 sm:w-36 sm:h-28 rounded-lg overflow-hidden border border-border/60 bg-secondary/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground tracking-tight">{variantLabel(variant)}</h3>
              </div>

              {variant.facilities && variant.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {variant.facilities.map((f: any) => (
                    <span
                      key={f.facility.id}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground border border-border/40"
                    >
                      {f.facility.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span className="font-bold text-sm text-foreground">
                  ৳{Number(variant.price).toLocaleString()}
                  <span className="font-normal text-xs text-muted-foreground"> / night</span>
                </span>
                {variant.max_occupancy && <span>• {variant.max_occupancy} guests</span>}
                {variant.room_size && <span>• {variant.room_size} sq ft</span>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setImageDialogOpen(true)}>
                  <ImageIcon className="h-3.5 w-3.5 mr-2" /> Manage Photos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={variant.room_details.length > 0}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {variant.room_details.length > 0 ? 'Delete unavailable with rooms' : 'Delete Room Variant'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom Section: Physical Rooms */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Physical Rooms</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground">
                {variant.room_details.length}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary font-medium" onClick={onAddRoom}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Rooms
            </Button>
          </div>

          {variant.room_details.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No physical rooms assigned to this configuration yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {variant.room_details.map((r: any) => (
                <RoomChip key={r.id} room={r} variantId={variant.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Configuration Photos</DialogTitle>
            <DialogDescription>Shared by every room in this configuration.</DialogDescription>
          </DialogHeader>
          <ImageManager
            images={variant.variant_images ?? []}
            uploadUrl={`/api/hotel-admin/room-variants/${variant.id}/images`}
            deleteUrlFor={(id) => `/api/hotel-admin/room-variants/${variant.id}/images/${id}`}
            coverUrlFor={(id) => `/api/hotel-admin/room-variants/${variant.id}/images/${id}`}
            onChanged={onChanged}
          />
        </DialogContent>
      </Dialog>

      <VariantFormDialog open={editOpen} onOpenChange={setEditOpen} variant={variant} onSaved={onChanged} />
    </Card>
  )
}

const RoomChip = ({ room, variantId }: { room: any; variantId: number }) => (
  <Link
    href={`/dashboard/hotel/rooms/variants/${variantId}/rooms/${room.id}`}
    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:border-emerald-500/60 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[room.status] ?? 'bg-slate-400')} />
    <span>{room.room_number}</span>
  </Link>
)