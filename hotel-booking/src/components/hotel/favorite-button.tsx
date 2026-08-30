'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type FavoriteButtonProps = {
  hotelId: number;
  initialIsFavorited?: boolean;
  className?: string;
  iconClassName?: string;
};

export default function FavoriteButton({
  hotelId,
  initialIsFavorited = false,
  className,
  iconClassName,
}: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // We don't strictly know if the user is logged out on the client without a session hook,
    // but we can let the API return 401 and handle the redirect, OR we can check for a cookie.
    // The safest is to try the optimistic update, and if it's 401, redirect.
    const prevFavorited = isFavorited;
    setIsFavorited(!isFavorited);
    setIsLoading(true);

    try {
      const res = await fetch('/api/public/favourites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hotelId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update favorite');
      }

      // Ensure state matches server response
      setIsFavorited(data.favorited);
      
      if (data.isGuest) {
        // Optional: Could trigger a subtle toast here like "Saved to your device. Sign in to keep it."
        // But for now, just silently succeed as requested.
      }
    } catch (error) {
      console.error('Favorite toggle failed:', error);
      setIsFavorited(prevFavorited); // rollback
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not save favorite',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      type="button"
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "grid size-9 place-items-center rounded-full backdrop-blur-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50",
        isFavorited 
          ? "bg-white/90 hover:bg-white text-red-500 shadow-sm" 
          : "bg-white/15 hover:bg-white/30 text-white",
        className
      )}
    >
      <Heart 
        className={cn("size-4 transition-transform", 
          isFavorited ? "fill-current" : "",
          iconClassName
        )} 
      />
    </button>
  );
}
