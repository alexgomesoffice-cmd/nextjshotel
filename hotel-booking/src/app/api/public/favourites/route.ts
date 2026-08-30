import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { isBlacklisted } from '@/lib/token-blacklist';

const GUEST_COOKIE_NAME = 'guest_favourites';

function getGuestFavorites(req: NextRequest): number[] {
  const cookieVal = req.cookies.get(GUEST_COOKIE_NAME)?.value;
  if (!cookieVal) return [];
  try {
    const parsed = JSON.parse(cookieVal);
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
      return parsed;
    }
  } catch {
    // Ignore invalid JSON
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hotelId = Number(body.hotelId);

    if (!hotelId || isNaN(hotelId)) {
      return NextResponse.json({ success: false, message: 'Valid hotelId is required' }, { status: 400 });
    }

    // Verify hotel exists and is published
    const hotel = await prisma.hotels.findFirst({
      where: {
        id: hotelId,
        approval_status: 'PUBLISHED',
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found or unavailable' }, { status: 404 });
    }

    // Attempt to authenticate
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
        // Silently ignore auth errors
      }
    }

    if (endUserId) {
      // ─── AUTHENTICATED USER FLOW ──────────────────────────────────────────
      const existingFav = await prisma.user_favourites.findUnique({
        where: { end_user_id_hotel_id: { end_user_id: endUserId, hotel_id: hotelId } },
      });

      if (existingFav) {
        await prisma.user_favourites.delete({ where: { id: existingFav.id } });
        await prisma.end_user_activity_logs.create({
          data: {
            actor_id: endUserId,
            action: 'FAVORITE_REMOVED',
            entity_type: 'HOTEL',
            entity_id: hotelId,
          },
        }).catch(() => {});
        return NextResponse.json({ success: true, favorited: false, isGuest: false });
      } else {
        await prisma.user_favourites.create({
          data: { end_user_id: endUserId, hotel_id: hotelId },
        });
        await prisma.end_user_activity_logs.create({
          data: {
            actor_id: endUserId,
            action: 'FAVORITE_ADDED',
            entity_type: 'HOTEL',
            entity_id: hotelId,
          },
        }).catch(() => {});
        return NextResponse.json({ success: true, favorited: true, isGuest: false });
      }
    } else {
      // ─── GUEST FLOW ───────────────────────────────────────────────────────
      let guestFavs = getGuestFavorites(req);
      let isFavorited = false;

      if (guestFavs.includes(hotelId)) {
        guestFavs = guestFavs.filter(id => id !== hotelId);
      } else {
        guestFavs.push(hotelId);
        isFavorited = true;
      }
      
      // Keep cookie size reasonable (e.g. max 100 favorites)
      if (guestFavs.length > 100) guestFavs.shift();

      const res = NextResponse.json({ success: true, favorited: isFavorited, isGuest: true });
      res.cookies.set(GUEST_COOKIE_NAME, JSON.stringify(guestFavs), {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
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
      } catch (err) {}
    }

    let favoriteHotels = [];

    if (endUserId) {
      // ─── AUTHENTICATED USER FLOW ──────────────────────────────────────────
      const favorites = await prisma.user_favourites.findMany({
        where: {
          end_user_id: endUserId,
          hotel: { approval_status: 'PUBLISHED', deleted_at: null },
        },
        orderBy: { created_at: 'desc' },
        include: {
          hotel: {
            include: {
              city: true,
              hotel_type: true,
              images: { where: { is_cover: true }, take: 1 },
              detail: true,
              room_types: {
                where: { is_active: true },
                select: { room_variants: { where: { is_active: true }, select: { price: true } } },
              },
              hotel_amenities: { include: { amenity: { select: { name: true } } } },
            },
          },
        },
      });
      favoriteHotels = favorites.map(f => f.hotel);
    } else {
      // ─── GUEST FLOW ───────────────────────────────────────────────────────
      const guestFavs = getGuestFavorites(req);
      if (guestFavs.length > 0) {
        favoriteHotels = await prisma.hotels.findMany({
          where: {
            id: { in: guestFavs },
            approval_status: 'PUBLISHED',
            deleted_at: null,
          },
          orderBy: { created_at: 'desc' },
          include: {
            city: true,
            hotel_type: true,
            images: { where: { is_cover: true }, take: 1 },
            detail: true,
            room_types: {
              where: { is_active: true },
              select: { room_variants: { where: { is_active: true }, select: { price: true } } },
            },
            hotel_amenities: { include: { amenity: { select: { name: true } } } },
          },
        });
      }
    }

    // Format output
    const formattedHotels = favoriteHotels.map(hotel => {
      const rts = hotel.room_types as Array<Record<string, unknown>>;
      const allVariantPrices: number[] = [];
      for (const rt of rts) {
        const variants = (rt.room_variants as Array<Record<string, unknown>> | undefined) ?? [];
        for (const v of variants) allVariantPrices.push(Number(String(v.price)));
      }
      const startingPrice = allVariantPrices.length > 0 ? Math.min(...allVariantPrices) : null;

      return {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        city: hotel.city?.name,
        hotel_type: hotel.hotel_type?.name,
        star_rating: hotel.detail?.star_rating ? Number(hotel.detail.star_rating) : null,
        guest_rating: hotel.detail?.guest_rating ? Number(hotel.detail.guest_rating) : null,
        cover_image: hotel.images[0]?.image_url || null,
        starting_price: startingPrice,
        address: hotel.address,
        amenities: (hotel.hotel_amenities || [])
          .slice(0, 3)
          .map((ha) => String(((ha as Record<string, unknown>).amenity as Record<string, unknown>).name)),
        isFavorited: true, // Always true for this endpoint
      };
    });

    return NextResponse.json({ success: true, data: formattedHotels, isGuest: !endUserId });
  } catch (error) {
    console.error('Failed to fetch favorites:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
