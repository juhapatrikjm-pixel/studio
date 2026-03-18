"use client"

import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './button';

type FavoriteItem = {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
};

interface FavoritesBarProps {
  favorites: FavoriteItem[];
  onRemoveFavorite: (id: string) => void;
  maxFavorites: number;
}

export function FavoritesBar({ favorites, onRemoveFavorite, maxFavorites }: FavoritesBarProps) {
  if (!favorites || favorites.length === 0) {
    return null; // Don't render if there are no favorites
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-auto max-w-[90%] z-50 mb-4">
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
        {favorites.map(fav => (
          <Link key={fav.id} href={fav.path} passHref>
            <Button variant="ghost" className="group relative flex items-center gap-2 px-4 h-12 rounded-xl hover:bg-accent/10 transition-all">
              <fav.icon className="w-5 h-5 text-accent" />
              <span className="font-bold text-sm text-white">{fav.label}</span>
               <button 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveFavorite(fav.id);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-white/50"/>
              </button>
            </Button>
          </Link>
        ))}
        {favorites.length < maxFavorites && (
           <div className='flex items-center text-xs text-muted-foreground/50 p-2'>
             <Star className='w-4 h-4 mr-2'/> Lisää suosikki valikosta
           </div>
        )}
      </div>
    </div>
  );
}
