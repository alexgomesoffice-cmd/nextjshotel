'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, ImageIcon, ArrowRight, Layers, DoorOpen, Trash2 } from 'lucide-react'

export const RoomTypeCard = ({
  roomType, onEdit, onManageImages, onDelete,
}: { roomType: any; onEdit: () => void; onManageImages: () => void; onDelete: () => void }) => {
  const cover = roomType.type_images?.[0]

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/15 to-transparent">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px]">No cover</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{roomType.name}</h3>
                <Badge variant={roomType.is_active ? 'default' : 'secondary'} className="shrink-0">
                  {roomType.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{roomType.description}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit Room Type</DropdownMenuItem>
                <DropdownMenuItem onClick={onManageImages}><ImageIcon className="h-3.5 w-3.5 mr-2" /> Manage Images</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={roomType.variant_count > 0}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {roomType.variant_count > 0 ? 'Delete unavailable with variants' : 'Delete Room Type'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {roomType.variant_count} configuration{roomType.variant_count === 1 ? '' : 's'}</span>
            <span className="inline-flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> {roomType.room_count} room{roomType.room_count === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-end justify-between mt-auto pt-3">
            {roomType.starting_price != null ? (
              <p className="text-sm font-semibold">From ৳{roomType.starting_price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
            ) : <span />}
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/hotel/rooms/${roomType.id}`}>
                View Room Type <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}