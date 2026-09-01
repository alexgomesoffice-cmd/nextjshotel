'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HotelCard, { HotelCardProps } from '@/components/hotel/hotel-card';

export default function FavoritesPage() {
  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/public/favourites', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setHotels(data.data || []);
        setIsGuest(!!data.isGuest);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchFavorites();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-secondary/10 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[450px] bg-muted rounded-3xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-secondary/10 py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
                Your Favorites
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Hotels you&apos;ve saved for your next trip.
              </p>
            </div>
            
            {isGuest && (
              <div className="flex items-center gap-4 bg-secondary/50 border border-border p-4 rounded-2xl max-w-sm">
                <div className="flex-1">
                  <p className="text-sm font-medium">Sign in to keep your favorites across devices.</p>
                </div>
                <Button asChild size="sm" className="rounded-full shrink-0">
                  <Link href="/login?callbackUrl=/favorites">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </header>

        {hotels.length > 0 ? (
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.map((hotel) => (
              <HotelCard 
                key={hotel.id} 
                {...hotel} 
                roomListMaxHeight="h-[300px]"
                favoritePage
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border border-border/50 bg-card shadow-sm">
            <div className="grid size-20 place-items-center rounded-full bg-secondary mb-6">
              <Heart className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Nothing saved yet</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Save hotels you love and they&apos;ll appear here when you&apos;re ready to book.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/search">
                <Search className="mr-2 size-4" />
                Explore hotels
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
