
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { normalizeSearchResults, TMDB } from '../services/tmdb';
import { Movie, Theme } from '../types';
import { Search, Loader2, Film, AlertTriangle, Star, Play, ChevronRight } from 'lucide-react';
import MovieCard from '../components/MovieCard';

const SearchPage: React.FC = () => {
  const { auth, t, lang, systemKey, setSelectedMovie, theme } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [trendingLanguages, setTrendingLanguages] = useState<Record<string, Movie[]>>({});
  const [showTrending, setShowTrending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestIdRef = useRef(0);
  const isDark = theme === Theme.DARK;
  // Fetch trending movies when input is focused and query is empty
  const handleInputFocus = async () => {
    if (!query && systemKey) {
      setShowTrending(true);
      if (trending.length === 0) {
        setLoading(true);
        try {
          const data = await TMDB.getTrending(systemKey);
          setTrending(data.results || []);
        } catch (e) {
          // ignore trending fetch errors
        } finally {
          setLoading(false);
        }
      }
      // Fetch trending for specific languages if not already loaded
      const langs = [
        { code: 'kn', label: 'Kannada' },
        { code: 'te', label: 'Telugu' },
        { code: 'ml', label: 'Malayalam' },
        { code: 'hi', label: 'Hindi' }
      ];
      const missingLangs = langs.filter(l => !trendingLanguages[l.code]);
      if (missingLangs.length > 0) {
        setLoading(true);
        try {
          const langResults: Record<string, Movie[]> = {};
          await Promise.all(missingLangs.map(async l => {
            const data = await TMDB.getLanguageMovies(systemKey, l.code);
            langResults[l.code] = data.results || [];
          }));
          setTrendingLanguages(prev => ({ ...prev, ...langResults }));
        } catch (e) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Hide trending when input is blurred (with a slight delay for click)
  const handleInputBlur = () => {
    setTimeout(() => setShowTrending(false), 150);
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!systemKey || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // First page renders quickly
      const firstPage = await TMDB.searchWithMulti(systemKey, searchQuery, 1);
      const firstResults = normalizeSearchResults(firstPage.results || []);
      if (requestId !== searchRequestIdRef.current) return;

      // If we have results, show them and fetch more in background
      if (firstResults.length > 0) {
        setResults(firstResults);
        setLoading(false);

        // Fetch remaining pages in background
        const rest = await Promise.allSettled([
          TMDB.searchWithMulti(systemKey, searchQuery, 2),
          TMDB.searchWithMulti(systemKey, searchQuery, 3),
          TMDB.searchWithMulti(systemKey, searchQuery, 4),
          TMDB.searchWithMulti(systemKey, searchQuery, 5)
        ]);

        if (requestId !== searchRequestIdRef.current) return;

        const merged = [
          ...firstResults,
          ...rest
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .flatMap(r => normalizeSearchResults(r.value?.results || []))
        ];

        const unique = merged.filter((movie, index, self) =>
          index === self.findIndex(m => m.id === movie.id)
        );

        if (unique.length > 0) {
          setResults(unique);
        }
      } else {
        // No direct results - fetch related content by genre/trending
        const relatedContent = await TMDB.getRelatedContent(systemKey, searchQuery);
        if (requestId === searchRequestIdRef.current) {
          if (relatedContent.length > 0) {
            setResults(relatedContent);
          } else {
            // Final fallback to trending
            const trendingData = await TMDB.getTrending(systemKey);
            setResults(trendingData.results || []);
          }
          setShowTrending(true);
        }
        setLoading(false);
      }
    } catch (e: any) {
      try {
        // On error, show related content or trending
        const relatedContent = await TMDB.getRelatedContent(systemKey, searchQuery);
        if (requestId === searchRequestIdRef.current) {
          if (relatedContent.length > 0) {
            setResults(relatedContent);
          } else {
            const trendingData = await TMDB.getTrending(systemKey);
            setResults(trendingData.results || []);
          }
          setShowTrending(true);
        }
      } catch {
        setError(e.message || 'Search failed');
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [systemKey]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSearchParams(newQuery ? { q: newQuery } : {});
    if (!newQuery && systemKey) {
      setShowTrending(true);
    } else {
      setShowTrending(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="p-6 md:p-12 min-h-screen">
      <header className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-8">Search Movies</h1>
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="text-white/30 group-focus-within:text-yellow-500 transition-colors" size={24} />
          </div>
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all placeholder:text-white/20"
            autoFocus
          />
          {loading && (
            <div className="absolute inset-y-0 right-6 flex items-center">
              <Loader2 className="animate-spin text-yellow-500" size={24} />
            </div>
          )}
        </form>
      </header>

      {error && (
        <div className="max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <main>
        {!systemKey && (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <AlertTriangle size={80} strokeWidth={1} className="mb-4" />
            <p className="text-xl font-medium">System configuration required by administrator.</p>
          </div>
        )}


        {/* Trending movies below search input */}

        {showTrending && (
          <div className="max-w-4xl mx-auto mt-4 mb-8 space-y-10">
            {trending.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4 text-yellow-500">Trending Movies (All Languages)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                  {trending.map(movie => (
                    <MovieCard key={movie.id} movie={movie} variant="large" />
                  ))}
                </div>
              </div>
            )}
            {[
              { code: 'kn', label: 'Kannada' },
              { code: 'te', label: 'Telugu' },
              { code: 'ml', label: 'Malayalam' },
              { code: 'hi', label: 'Hindi' }
            ].map(l => (
              trendingLanguages[l.code] && trendingLanguages[l.code].length > 0 && (
                <div key={l.code}>
                  <h2 className="text-lg font-bold mb-4 text-yellow-500">Trending Movies ({l.label})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                    {trendingLanguages[l.code].map(movie => (
                      <MovieCard key={movie.id} movie={movie} variant="large" />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {!query && systemKey && !showTrending && (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <Film size={80} strokeWidth={1} className="mb-4" />
            <p className="text-xl font-medium">Type something to explore cinema...</p>
          </div>
        )}

        {query && !loading && results.length === 0 && systemKey && (
          <div className="text-center py-24 text-white/40">
            <p className="text-xl">No exact matches for "<span className="text-white">{query}</span>". Showing featured titles below.</p>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-8">
          {results.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-yellow-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-yellow-500">
                  {query ? `Results for "${query}"` : 'Featured Movies'}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                {results.map(movie => (
                  <MovieCard key={movie.id} movie={movie} variant="large" />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
