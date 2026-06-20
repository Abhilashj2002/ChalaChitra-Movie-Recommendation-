import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { Movie, Theme } from '../types';
import { ChevronLeft, Star, Play, Tv, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GENRES } from '../constants';

const LANGUAGE_CARDS = [
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

const SeriesPage: React.FC = () => {
  const { theme, systemKey, setSelectedMovie } = useApp();
  const navigate = useNavigate();
  const isDark = theme === Theme.DARK;

  const [series, setSeries] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const apiKey = systemKey || (import.meta as any).env.VITE_TMDB_API_KEY || '';
    if (!apiKey) return;

    setLoading(true);
    const fetchSeries = async () => {
      try {
        // Fetch 5 pages to get 100+ series
        const pages = [1, 2, 3, 4, 5];
        let allResults: Movie[] = [];

        for (const page of pages) {
          let data;
          if (selectedLanguage && selectedGenre) {
            data = await TMDB.fetch('/discover/tv', apiKey, {
              with_original_language: selectedLanguage,
              with_genres: selectedGenre.toString(),
              sort_by: 'popularity.desc',
              page: page.toString()
            }, 'discover');
          } else if (selectedLanguage) {
            data = await TMDB.fetch('/discover/tv', apiKey, {
              with_original_language: selectedLanguage,
              sort_by: 'popularity.desc',
              page: page.toString()
            }, 'discover');
          } else if (selectedGenre) {
            data = await TMDB.fetch('/discover/tv', apiKey, {
              with_genres: selectedGenre.toString(),
              sort_by: 'popularity.desc',
              page: page.toString()
            }, 'discover');
          } else {
            data = await TMDB.fetch('/tv/popular', apiKey, { page: page.toString() }, 'trending');
          }

          if (data?.results) {
            const tvResults = data.results.map((tv: any) => ({ ...tv, media_type: 'tv' }));
            allResults = [...allResults, ...tvResults];
          }
        }

        // Remove duplicates
        const uniqueResults = allResults.filter((item, index, self) =>
          index === self.findIndex(m => m.id === item.id)
        );

        setSeries(uniqueResults);
      } catch (error) {
        console.error('Failed to load series:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, [systemKey, selectedLanguage, selectedGenre]);

  const clearFilters = () => {
    setSelectedLanguage('');
    setSelectedGenre('');
  };

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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-600/30">
              <Tv size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                TV Series
              </h1>
              <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                {series.length}+ shows available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-14 py-8">
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black uppercase tracking-tighter">Filter Series</h2>
            {(selectedLanguage || selectedGenre) && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-zinc-500">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold border"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)', color: 'var(--theme-text)' }}
              >
                <option value="">All Languages</option>
                {LANGUAGE_CARDS.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-zinc-500">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : '')}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
              >
                <option value="">All Genres</option>
                {Object.entries(GENRES).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-zinc-500">Quick Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={14} className="text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Find a series..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-bold border"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)', color: 'var(--theme-text)' }}
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="px-6 md:px-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : series.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-purple-600 rounded-full" />
                <h2 className="text-2xl font-black tracking-tighter uppercase">
                  {selectedLanguage && selectedGenre ? `${LANGUAGE_CARDS.find(l => l.code === selectedLanguage)?.name} ${GENRES[selectedGenre as number] || ''} Series` :
                    selectedLanguage ? `${LANGUAGE_CARDS.find(l => l.code === selectedLanguage)?.name} Series` :
                    selectedGenre ? `${GENRES[selectedGenre as number] || ''} Series` :
                    'Popular TV Series'}
                </h2>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                {series.length} shows loaded
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
              {series.filter(s => 
                (s.title || (s as any).name || '').toLowerCase().includes(searchTerm.toLowerCase())
              ).map(item => (
                <div key={item.id} onClick={() => { setSelectedMovie({ ...item, media_type: 'tv' }, false); }} className="group cursor-pointer">
                  <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 ring-0 group-hover:ring-4 ring-purple-500 transition-all duration-300 shadow-xl">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title || (item as any).name}
                      className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-40 transition-all duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-purple-600 p-4 rounded-full scale-50 group-hover:scale-100 transition-transform">
                        <Play fill="white" size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[9px] text-white font-bold">{(item.vote_average || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-bold text-sm line-clamp-1 text-zinc-100">{item.title || (item as any).name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-purple-500">TV Series</span>
                      <span className="text-[10px] text-zinc-500">•</span>
                      <span className="text-[10px] text-zinc-500">{(item as any).first_air_date?.slice(0, 4) || 'N/A'}</span>
                      <span className="text-[10px] text-zinc-500">•</span>
                      <span className="text-[10px] text-zinc-500 flex items-center"><Star size={10} className="mr-1 text-yellow-500 inline" />{(item.vote_average || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-32">
            <Tv size={64} className={`mx-auto mb-4 ${isDark ? 'text-zinc-700' : 'text-slate-300'}`} />
            <p className={`text-xl ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>No series found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesPage;
