
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { SimpleDB as DB } from '../services/simpleDb';
import { Movie, Theme } from '../types';
// Added AlertTriangle to the imports from lucide-react
import { ChevronLeft, Loader2, TrendingUp, Sparkles, Globe, Gem, History, AlertTriangle } from 'lucide-react';
import MovieCard from '../components/MovieCard';

const DiscoverPage: React.FC = () => {
  const { auth, t, lang, theme, systemKey } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'trending';
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (pageNumber: number, isInitial: boolean = false) => {
    if (!systemKey) {
      if (isInitial) {
        setLoading(false);
      }
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);

    try {
      const apiKey = systemKey;
      const userId = auth.user?.id || 'guest';
      let results: Movie[] = [];
      let totalPages = 1;

      switch (type) {
        case 'trending':
          const trendData = await TMDB.getTrending(apiKey, pageNumber);
          results = trendData.results;
          totalPages = trendData.total_pages;
          break;
        case 'priority':
          const priorityLang = auth.user?.preferences?.priorityLanguage || null;
          const priorityData = await TMDB.getRecommendations(apiKey, [], priorityLang, pageNumber);
          results = priorityData.results;
          totalPages = priorityData.total_pages;
          break;
        case 'kannada':
          const knData = await TMDB.getLanguageMovies(apiKey, 'kn', pageNumber);
          results = knData.results;
          totalPages = knData.total_pages;
          break;
        case 'telugu':
          const teData = await TMDB.getLanguageMovies(apiKey, 'te', pageNumber);
          results = teData.results;
          totalPages = teData.total_pages;
          break;
        case 'hindi':
          const hiData = await TMDB.getLanguageMovies(apiKey, 'hi', pageNumber);
          results = hiData.results;
          totalPages = hiData.total_pages;
          break;
        case 'malayalam':
          const mlData = await TMDB.getLanguageMovies(apiKey, 'ml', pageNumber);
          results = mlData.results;
          totalPages = mlData.total_pages;
          break;
        case 'blockbusters':
          const blockData = await TMDB.getBlockbusters(apiKey, pageNumber);
          results = blockData.results;
          totalPages = blockData.total_pages;
          break;
        case 'gems':
          const gemData = await TMDB.getHiddenGems(apiKey, pageNumber);
          results = gemData.results;
          totalPages = gemData.total_pages;
          break;
        case 'history':
          if (pageNumber === 1 && auth.user) {
            const historyIds = await DB.history.get(auth.user.id);
            const trend = await TMDB.getTrending(apiKey, 1);
            const picks = await TMDB.getRecommendations(apiKey, [], null, 1);
            const all = [...trend.results, ...picks.results];
            results = historyIds.map(id => all.find(m => m.id === id)).filter(Boolean) as Movie[];
            totalPages = 1;
          } else {
            results = [];
            totalPages = 1;
          }
          break;
        case 'foryou':
          const userPriority = auth.user?.preferences?.priorityLanguage || null;
          const recsData = await TMDB.getRecommendations(apiKey, [], userPriority, pageNumber);
          results = recsData.results;
          totalPages = recsData.total_pages;
          break;
        default:
          const defaultTrend = await TMDB.getTrending(apiKey, pageNumber);
          results = defaultTrend.results;
          totalPages = defaultTrend.total_pages;
      }

      setMovies(prev => {
        const combined = isInitial ? results : [...prev, ...results];
        return combined.filter((movie, index, self) => 
          self.findIndex(m => m.id === movie.id) === index
        );
      });
      setHasMore(pageNumber < totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load movies");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [type, systemKey, auth.user]);

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    isFetchingRef.current = false;
    if (observer.current) observer.current.disconnect();
    fetchData(1, true);
  }, [type, fetchData]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const next = prev + 1;
          fetchData(next);
          return next;
        });
      }
    }, { rootMargin: '200px 0px', threshold: 0.1 });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, fetchData]);

  const getHeaderInfo = () => {
    switch (type) {
      case 'trending': return { title: t('trending'), icon: <TrendingUp className="text-yellow-500" /> };
      case 'priority': return { title: t('priorityContent'), icon: <Globe className="text-emerald-500" /> };
      case 'kannada': return { title: t('kannadaMovies'), icon: <Globe className="text-yellow-500" /> };
      case 'telugu': return { title: t('teluguMovies'), icon: <Globe className="text-emerald-500" /> };
      case 'hindi': return { title: t('hindiMovies'), icon: <Globe className="text-rose-500" /> };
      case 'malayalam': return { title: t('malayalamMovies'), icon: <Globe className="text-indigo-500" /> };
      case 'blockbusters': return { title: t('blockbusters2020'), icon: <Sparkles className="text-amber-500" /> };
      case 'gems': return { title: t('hiddenGems'), icon: <Gem className="text-yellow-500" /> };
      case 'history': return { title: lang === 'kn' ? 'ನೋಡುವುದನ್ನು ಮುಂದುವರಿಸಿ' : 'Continue Watching', icon: <History className="text-blue-500" /> };
      case 'foryou': return { title: lang === 'kn' ? 'ನಿಮಗಾಗಿ ಶಿಫಾರಸುಗಳು' : 'Personalized For You', icon: <Sparkles className="text-yellow-500" /> };
      default: return { title: t('trending'), icon: <TrendingUp className="text-yellow-500" /> };
    }
  };

  const { title, icon } = getHeaderInfo();

  return (
    <div className="min-h-screen p-6 md:p-12 pb-24">
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className={`p-3 rounded-2xl border transition-all active:scale-95 ${theme === Theme.DARK ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-indigo-100 text-slate-900 hover:bg-slate-50 shadow-sm'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${theme === Theme.DARK ? 'bg-white/5' : 'bg-white shadow-md border border-indigo-50'}`}>
              {icon}
            </div>
            <div>
              <h1 className={`text-4xl font-black uppercase tracking-tighter ${theme === Theme.DARK ? 'text-white' : 'text-indigo-950'}`}>
                {title}
              </h1>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-indigo-400'}`}>
                Exploration Gallery • Page {page}
              </p>
            </div>
          </div>
        </div>
      </header>

      {!systemKey ? (
        <div className="flex flex-col items-center justify-center py-40 text-center">
           <AlertTriangle size={48} className="text-amber-500 mb-4" />
           <p className="font-bold">Service Not Ready</p>
           <p className="text-white/40 text-sm">Waiting for administrator configuration.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
          <p className={`font-black uppercase tracking-widest text-xs ${theme === Theme.DARK ? 'text-white/20' : 'text-indigo-400'}`}>
            Synchronizing Library...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-40">
          <p className="text-red-500 font-bold">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} variant="large" />
            ))}
          </div>

          <div ref={lastElementRef} className="h-20 w-full flex items-center justify-center mt-12">
            {loadingMore && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">Fetching More Gems...</span>
              </div>
            )}
            {!hasMore && movies.length > 0 && (
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400/40 border-t border-indigo-100/10 pt-8 w-full text-center">
                End of Library • Check back soon
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DiscoverPage;
