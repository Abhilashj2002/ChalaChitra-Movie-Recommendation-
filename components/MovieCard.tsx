
import React, { useState, useEffect, useMemo } from 'react';
import { GENRES } from '../constants';
import { Play, Plus, Star, Check, Eye } from 'lucide-react';
import { Movie, Theme } from '../types';
import { SimpleDB as DB } from '../services/simpleDb';
import { TMDB } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import MovieRating from './MovieRating';

interface MovieCardProps {
  movie: Movie;
  variant?: 'compact' | 'large';
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, variant = 'compact' }) => {
  const { auth, setSelectedMovie, theme } = useApp();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (auth.user) {
      DB.ratings.get(auth.user.id, movie.id).then(setUserRating);
      DB.history.exists(auth.user.id, movie.id).then(setIsWatched);
    }
  }, [auth.user, movie.id]);

  const handleRate = async (score: number) => {
    if (auth.user) {
      await DB.ratings.set(auth.user.id, movie.id, score);
      setUserRating(score);
      setShowRating(false);
      await DB.history.add(auth.user.id, movie.id);
      setIsWatched(true);
      TMDB.invalidateTags(['recommendations']);
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (auth.user) {
      await DB.history.add(auth.user.id, movie.id);
      setIsWatched(true);
      TMDB.invalidateTags(['recommendations']);
    }
    setSelectedMovie(movie, true);
  };

  const handleCardClick = () => {
    if (!showRating) {
      setSelectedMovie(movie, false);
    }
  };

  const cardWidth = variant === 'compact' ? 'w-40 md:w-52' : 'w-full';

  const posterSrc = movie.poster_path || movie.backdrop_path;

  return (
    <div 
      className={`${cardWidth} flex-shrink-0 group cursor-pointer animate-in fade-in duration-500`}
      onClick={handleCardClick}
    >
      <div className={`relative aspect-[2/3] overflow-hidden rounded-[1.5rem] mb-3 shadow-lg transition-all duration-500 ${theme === Theme.DARK ? 'group-hover:shadow-yellow-500/10' : 'shadow-indigo-900/5 group-hover:shadow-indigo-600/10 group-hover:-translate-y-1'}`}>
        {posterSrc ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${posterSrc}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            alt={movie.title}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-900/30 flex items-center justify-center text-white/40 text-xs font-bold uppercase tracking-widest">
            No Poster
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
          {!showRating ? (
            <div className="flex gap-3">
              <button 
                onClick={handlePlayClick}
                className="p-3 bg-white text-black rounded-full hover:bg-yellow-500 transition-colors transform active:scale-90"
              >
                <Play fill="currentColor" size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowRating(true); }}
                className="p-3 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors transform active:scale-90"
              >
                <Star size={20} className={userRating ? 'fill-yellow-500 text-yellow-500' : ''} />
              </button>
            </div>
          ) : (
            <div className="p-2 animate-in fade-in zoom-in duration-200">
               <MovieRating initialRating={userRating} onRate={handleRate} />
               <button 
                  onClick={(e) => { e.stopPropagation(); setShowRating(false); }}
                  className="mt-2 text-[10px] uppercase font-bold text-white/60 hover:text-white block mx-auto py-1"
                >
                  Cancel
                </button>
            </div>
          )}
        </div>

        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
           <div className={`backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black ${theme === Theme.DARK ? 'bg-black/60 text-white' : 'bg-white/90 text-indigo-950 border border-indigo-100 shadow-sm'}`}>
            <Star size={10} className="text-yellow-500 fill-yellow-500" />
            {movie.vote_average.toFixed(1)}
          </div>
          {isWatched && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black animate-in slide-in-from-left-2 shadow-lg">
              <Eye size={10} strokeWidth={4} />
              Watched
            </div>
          )}
        </div>
      </div>
      
      <div className="px-1">
        <h3 className={`font-black text-[13px] line-clamp-1 transition-colors uppercase tracking-tight ${theme === Theme.DARK ? 'text-white group-hover:text-yellow-500' : 'text-slate-800 group-hover:text-indigo-600'}`}> 
          {movie.title}
        </h3>
        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}> 
          {movie.release_date?.split('-')[0]} • {movie.original_language.toUpperCase()}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {movie.genre_ids?.slice(0, 3).map(id => (
            <span key={id} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${theme === Theme.DARK ? 'bg-white/10 text-white/40' : 'bg-indigo-100 text-indigo-600'}`}>{GENRES[id]}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
