
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface MovieRatingProps {
  initialRating: number | null;
  onRate: (rating: number) => void;
}

const MovieRating: React.FC<MovieRatingProps> = ({ initialRating, onRate }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={(e) => {
            e.stopPropagation();
            onRate(star);
          }}
          className="transition-transform active:scale-90 hover:scale-110"
        >
          <Star
            size={18}
            className={`transition-colors ${
              (hovered ?? initialRating ?? 0) >= star
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-white/20'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default MovieRating;
