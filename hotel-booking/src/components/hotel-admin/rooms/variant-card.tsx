'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MoreVertical, ImageIcon, Pencil, DoorOpen, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { ImageManager } from './image-manager'
import { VariantFormDialog } from './variant-form-dialog'

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-green-500/10 text-green-600 border-green-500/30',
  BOOKED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  CHECKED_IN: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  CHECKED_OUT: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  MAINTENANCE: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
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
  const [roomsOpen, setRoomsOpen] = useState(true)
  const cover = variant.variant_images?.find((i: any) => i.is_cover) ?? variant.variant_images?.[0]

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-56 aspect-video sm:aspect-auto shrink-0 bg-gradient-to-br from-indigo-500/15 to-transparent">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="p-4 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{variantLabel(variant)}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {variant.facilities.map((f: any) => (
                  <span key={f.facility.id} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{f.facility.name}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setRoomsOpen((v) => !v)}>
                {roomsOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                {roomsOpen ? 'Hide Rooms' : 'View Rooms'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setImageDialogOpen(true)}><ImageIcon className="h-3.5 w-3.5 mr-2" /> Manage Photos</DropdownMenuItem>
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

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">৳{Number(variant.price).toLocaleString()}<span className="font-normal">/night</span></span>
            {variant.max_occupancy && <span>{variant.max_occupancy} guests</span>}
            {variant.room_size && <span>{variant.room_size}</span>}
          </div>

          {roomsOpen && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Physical Rooms · {variant.room_details.length}</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddRoom}><Plus className="h-3 w-3 mr-1" /> Add Rooms</Button>
              </div>
              {variant.room_details.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No rooms in this configuration yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {variant.room_details.map((r: any) => (
                    <RoomChip key={r.id} room={r} variantId={variant.id} />
                  ))}
                </div>
              )}
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
    className={cn(
      'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      STATUS_COLOR[room.status] ?? ''
    )}
  >
    <DoorOpen className="h-3 w-3" /> {room.room_number}
  </Link>
)