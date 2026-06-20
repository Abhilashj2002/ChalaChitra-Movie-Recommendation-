import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { Movie, Language, Theme } from '../types';
import { ChevronLeft, Filter, Star, Play, Grid, List, Search, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { GENRES } from '../constants';

const LANGUAGE_CONFIG: Record<string, { name: string; flag: string; code: string }> = {
  en: { name: 'English', flag: '🇺🇸', code: 'en' },
  hi: { name: 'Hindi', flag: '🇮🇳', code: 'hi' },
  kn: { name: 'Kannada', flag: '🇮🇳', code: 'kn' },
  te: { name: 'Telugu', flag: '🇮🇳', code: 'te' },
  ta: { name: 'Tamil', flag: '🇮🇳', code: 'ta' },
  ml: { name: 'Malayalam', flag: '🇮🇳', code: 'ml' },
  ja: { name: 'Japanese', flag: '🇯🇵', code: 'ja' },
  ko: { name: 'Korean', flag: '🇰🇷', code: 'ko' },
  zh: { name: 'Chinese', flag: '🇨🇳', code: 'zh' },
  fr: { name: 'French', flag: '🇫🇷', code: 'fr' },
  es: { name: 'Spanish', flag: '🇪🇸', code: 'es' },
  de: { name: 'German', flag: '🇩🇪', code: 'de' },
  it: { name: 'Italian', flag: '🇮🇹', code: 'it' },
  pt: { name: 'Portuguese', flag: '🇵🇹', code: 'pt' },
  ru: { name: 'Russian', flag: '🇷🇺', code: 'ru' },
};

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'primary_release_date.desc', label: 'Newest' },
  { value: 'primary_release_date.asc', label: 'Oldest' },
  { value: 'original_title.asc', label: 'A-Z' },
];

const LanguagePage: React.FC = () => {
  const { langCode } = useParams<{ langCode: string }>();
  const { theme, systemKey, setSelectedMovie, t } = useApp();
  const navigate = useNavigate();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const isDark = theme === Theme.DARK;
  const language = langCode ? LANGUAGE_CONFIG[langCode] : null;

  useEffect(() => {
    if (!langCode || !systemKey) return;

    setLoading(true);
    const fetchMovies = async () => {
      try {
        const genreIds = selectedGenre ? [Number(selectedGenre)] : [];
        const data = await TMDB.getLanguageMoviesWithFilters(
          systemKey,
          langCode,
          genreIds,
          sortBy,
          page
        );
        setMovies(page === 1 ? data.results : [...movies, ...data.results]);
        setTotalPages(data.total_pages || 1);
      } catch (error) {
        console.error('Failed to fetch language movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [langCode, systemKey, selectedGenre, sortBy, page]);

  const handleGenreChange = (genreId: number | '') => {
    setSelectedGenre(genreId);
    setPage(1);
    setMovies([]);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
    setMovies([]);
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (!language) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Language not found</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
      {/* Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: isDark ? 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-primary) 30%, transparent), var(--theme-background))' : 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-primary) 10%, transparent), var(--theme-background))' }}></div>
        <div className="relative z-10 px-6 md:px-14 pt-20">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ChevronLeft size={16} /> Back to Home
          </button>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl">{language.flag}</span>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                {language.name} Movies
              </h1>
              <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                {movies.length}+ titles available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="px-6 md:px-14 py-6 sticky top-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 80%, transparent)', borderBottomColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-red-600 text-white' : isDark ? 'bg-white/5 text-white/60 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'}`}
            >
              <Filter size={14} />
              Filters
            </button>

            {selectedGenre && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                {GENRES[selectedGenre as number]}
                <button onClick={() => handleGenreChange('')} className="ml-2 hover:text-white">×</button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)', color: 'var(--theme-text)' }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-red-600 text-white' : isDark ? 'bg-zinc-900' : 'bg-white'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-red-600 text-white' : isDark ? 'bg-zinc-900' : 'bg-white'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search in this language..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-red-500"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)', color: 'var(--theme-text)' }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className={`p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            <button
              onClick={() => handleGenreChange('')}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!selectedGenre ? 'bg-red-600 text-white' : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'}`}
            >
              All Genres
            </button>
            {Object.entries(GENRES).slice(0, 10).map(([id, label]) => (
              <button
                key={id}
                onClick={() => handleGenreChange(Number(id))}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedGenre === Number(id) ? 'bg-red-600 text-white' : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="px-6 md:px-14 py-8">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
            {movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(movie => (
              <div
                key={movie.id}
                onClick={() => setSelectedMovie(movie, false)}
                className="group cursor-pointer animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 ring-0 group-hover:ring-4 ring-red-500 transition-all duration-300 shadow-xl">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-40 transition-all duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-red-600 p-4 rounded-full scale-50 group-hover:scale-100 transition-transform">
                      <Play fill="white" size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[9px] text-white font-bold">{movie.vote_average.toFixed(1)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-sm line-clamp-1">{movie.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className={isDark ? 'text-white/40' : 'text-slate-500'}>
                      {movie.release_date?.split('-')[0] || 'N/A'}
                    </span>
                    <span className={isDark ? 'text-white/30' : 'text-slate-400'}>•</span>
                    <span className={isDark ? 'text-red-400' : 'text-red-600'}>{language.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(movie => (
              <div
                key={movie.id}
                onClick={() => setSelectedMovie(movie, false)}
                className="flex gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] border"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                  alt={movie.title}
                  className="w-24 h-36 object-cover rounded-lg"
                  loading="lazy"
                />
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-lg mb-2">{movie.title}</h3>
                  <p className={`text-sm line-clamp-2 mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{movie.overview}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                    <span>{movie.release_date?.split('-')[0]}</span>
                    <span className="text-red-500">{language.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && page === 1 && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        )}

        {/* Load More */}
        {!loading && page < totalPages && (
          <div className="flex justify-center mt-12">
            <button
              onClick={loadMore}
              className="px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95"
            >
              Load More ({page}/{totalPages})
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && movies.length === 0 && (
          <div className="text-center py-32">
            <p className={`text-xl ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              No movies found in {language.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguagePage;
