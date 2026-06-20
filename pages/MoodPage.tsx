
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MOODS } from '../constants';
import { TMDB } from '../services/tmdb';
import { getMoodAdvice } from '../services/gemini';
import { Movie } from '../types';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import MovieCard from '../components/MovieCard';

const MoodPage: React.FC = () => {
  const { auth, lang, t, systemKey } = useApp();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [advice, setAdvice] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedMoodConfig = selectedMood ? MOODS.find(m => m.id === selectedMood) : null;
  const selectedMoodLabel = selectedMoodConfig
    ? (lang === 'kn' ? selectedMoodConfig.labelKn : selectedMoodConfig.labelEn)
    : '';

  // If mood-based results are not appearing, check TMDB API key and genre mapping in MOODS.
  const handleMoodSelect = async (moodId: string) => {
    const requestId = ++requestIdRef.current;
    if (!systemKey) {
      setSelectedMood(moodId);
      setAdvice('');
      setMovies([]);
      setError(t('tmdbKeyMissing') || 'Please update your access token in Settings to synchronize movie data.');
      return;
    }

    setSelectedMood(moodId);
    setLoading(true);
    setError(null);
    setAdvice('');
    setMovies([]);

    try {
      const moodConfig = MOODS.find(m => m.id === moodId);
      if (!moodConfig) return;

      const priorityLang = auth.user?.preferences?.priorityLanguage || null;

      const [aiResult, tmdbResult] = await Promise.allSettled([
        getMoodAdvice(moodConfig.labelEn, lang),
        TMDB.getRecommendations(systemKey, moodConfig.genres, priorityLang)
      ]);

      if (requestId !== requestIdRef.current) return;

      if (aiResult.status === 'fulfilled') {
        setAdvice(aiResult.value || '');
      }

      if (tmdbResult.status === 'fulfilled') {
        let results = tmdbResult.value.results || [];
        // Only keep movies that match all genres for the mood, or fallback to any matching genre
        let filtered = results.filter((movie: any) => movie.genre_ids && moodConfig.genres.every((g: number) => movie.genre_ids.includes(g)));
        if (filtered.length === 0) {
          // fallback: at least one genre matches
          filtered = results.filter((movie: any) => movie.genre_ids?.some((id: number) => moodConfig.genres.includes(id)));
        }
        let finalResults = (filtered.length > 0 ? filtered : results).filter((movie: any) => movie.poster_path || movie.backdrop_path);
        // Fallback: If no results, fetch trending movies
        if (finalResults.length === 0) {
          try {
            const trending = await TMDB.getTrending(systemKey);
            finalResults = (trending.results || []).filter((movie: any) => movie.poster_path || movie.backdrop_path);
          } catch (trendErr) {
            // If trending also fails, keep finalResults empty
          }
        }
        setMovies(finalResults.slice(0, 12));
      } else {
        throw tmdbResult.reason;
      }
    } catch (e: any) {
      console.error(e);
      if (requestId !== requestIdRef.current) return;
      if (e?.message === 'API_KEY_INVALID') {
        setError('The global TMDB connection is invalid. Please contact an Administrator.');
      } else if (e?.message === 'API_KEY_MISSING') {
        setError(t('tmdbKeyMissing') || 'Please update your access token in Settings to synchronize movie data.');
      } else {
        setError(e.message || 'Failed to fetch mood suggestions');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 md:p-12 min-h-screen">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('moods')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood.id)}
              className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border ${selectedMood === mood.id
                  ? 'bg-yellow-500 text-black border-yellow-500 scale-105'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
            >
              <span className="text-4xl">{mood.icon}</span>
              <span className="font-bold">{lang === 'kn' ? mood.labelKn : mood.labelEn}</span>
            </button>
          ))}
        </div>
        {selectedMoodLabel && (
          <p className="mt-5 text-white/70 text-sm font-semibold flex items-center gap-2">
            <span className="text-yellow-500 font-black">*</span>
            {selectedMoodLabel}
          </p>
        )}
      </header>

      {!systemKey && (
        <div className="text-center py-20 text-white/40">
          <AlertCircle size={40} className="mx-auto mb-4" />
          <p className="mb-3">{t('tmdbKeyMissing')}</p>
          <Link to="/settings" className="text-yellow-500 font-bold hover:underline">
            Go to Settings
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-yellow-500 mb-4" size={40} />
          <p className="text-white/60">Fetching the perfect mood-match...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 rounded-3xl border border-red-500/10">
          <AlertCircle className="text-red-500 mb-4" size={40} />
          <p className="text-red-500 font-bold mb-2">Something went wrong</p>
          <p className="text-white/40 text-sm max-w-xs text-center">{error}</p>
          <button
            onClick={() => selectedMood && handleMoodSelect(selectedMood)}
            className="mt-6 text-yellow-500 font-bold hover:underline"
          >
            Retry Recommendation
          </button>
        </div>
      )}

      {selectedMood && !loading && !error && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5">
          {selectedMoodLabel && (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">
                Recommendations for {selectedMoodLabel}
              </h2>
            </div>
          )}
          {advice && advice.trim() !== "" && (
            <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-yellow-500 relative overflow-hidden">
              <Sparkles className="absolute top-4 right-4 text-yellow-500/20" size={60} />
              <h3 className="text-yellow-500 font-bold mb-2 flex items-center gap-2">
                <Sparkles size={16} /> ChalaChitra Insight
              </h3>
              <p className="text-lg leading-relaxed">{advice}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} variant="large" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodPage;
