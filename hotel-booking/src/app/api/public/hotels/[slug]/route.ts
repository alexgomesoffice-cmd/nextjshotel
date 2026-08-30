import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePriceForDate } from '@/lib/pricing-resolver';
import { verifyToken } from '@/lib/jwt';
import { isBlacklisted } from '@/lib/token-blacklist';

/**
 * GET /api/public/hotels/[slug]
 * Rewritten — was including room_types.room_details (a relation that no
 * longer exists; room_details connects via room_variant_id now) and
 * hotels.custom_amenities (removed entirely once amenities became fully
 * global). Room types now include their variants with today's resolved
 * price for the "from ৳X/night" display on the hotel page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Hotel slug is required' }, { status: 400 });
    }

    // ─── Resolve Authentication for Favorites ───────────────────────────────────
    let endUserId: number | null = null;
    const token = req.cookies.get('token_user')?.value;
    if (token) {
      try {
        if (!(await isBlacklisted(token))) {
          const payload = await verifyToken(token);
          if (payload.actor_type === 'END_USER' && payload.actor_id) {
            endUserId = payload.actor_id;
          }
        }
      } catch (err) {
        // Silently ignore auth errors for public routes
      }
    }

    const hotel = await prisma.hotels.findUnique({
      where: { slug, approval_status: 'PUBLISHED', deleted_at: null },
      include: {
        city: true,
        hotel_type: true,
        detail: true,
        images: { orderBy: { sort_order: 'asc' } },
        hotel_amenities: { include: { amenity: true } },
        policies: { where: { deleted_at: null } },
        room_types: {
          where: { is_active: true },
          include: {
            type_images: { orderBy: { sort_order: 'asc' } },
            room_type_amenities: { include: { amenity: true } },
            room_variants: {
              where: { is_active: true },
              include: {
                variant_images: { orderBy: { sort_order: 'asc' } },
                facilities: { include: { facility: true } },
                bed_types: { include: { bed_type: true } },
                pricing_rules: { where: { status: 'ACTIVE' } },
                room_details: { where: { status: 'AVAILABLE', deleted_at: null }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 });
    }

    // ─── Fetch Favorite Status ────────────────────────────────────────────────
    let isFavorited = false;
    if (endUserId) {
      const fav = await prisma.user_favourites.findUnique({
        where: {
          end_user_id_hotel_id: {
            end_user_id: endUserId,
            hotel_id: hotel.id,
          },
        },
      });
      if (fav) isFavorited = true;
    } else {
      const cookieVal = req.cookies.get('guest_favourites')?.value;
      if (cookieVal) {
        try {
          const parsed = JSON.parse(cookieVal);
          if (Array.isArray(parsed) && parsed.includes(hotel.id)) {
            isFavorited = true;
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    const today = new Date();
    const { room_types, ...hotelRest } = hotel;
    const formattedRoomTypes = room_types.map((rt) => {
      const { room_variants, ...rtRest } = rt;
      return {
        ...rtRest,
        room_variants: room_variants.map((v) => {
          const { room_details, pricing_rules, ...vRest } = v;
          return {
            ...vRest,
            room_count: room_details.length,
            pricing: resolvePriceForDate(Number(v.price), pricing_rules as any, today),
          };
        }),
      };
    });

    return NextResponse.json({ success: true, data: { ...hotelRest, isFavorited, room_types: formattedRoomTypes } });
  } catch (error) {
    console.error('Failed to fetch hotel details:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch hotel details' }, { status: 500 });
  }
}