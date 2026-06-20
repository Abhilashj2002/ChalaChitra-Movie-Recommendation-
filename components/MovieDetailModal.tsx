import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { SimpleDB as DB } from '../services/simpleDb';
import {
  X, Play, Star, Calendar, Loader2, Plus,
  Eye, EyeOff, AlertCircle, ExternalLink,
  Monitor, Clock, Globe2, Users, UserCheck,
  Wallet, Landmark, Languages, Briefcase
} from 'lucide-react';
import { GENRES } from '../constants';
import { Movie, Theme } from '../types';
import MovieCard from './MovieCard';
import YouTubePlayer from './YouTubePlayer';

/* ─── Interfaces ──────────────────────────────────────────── */

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface WatchProvidersData {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface PersonDetails {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
}

interface PersonMovieCredit {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  character?: string;
  vote_average: number;
  popularity?: number;
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
}

interface Review {
  id: string;
  author: string;
  content: string;
  author_details: { rating: number | null };
}

interface MovieExtendedDetails {
  runtime: number | null;
  budget: number;
  revenue: number;
  production_companies: { id: number; name: string; logo_path: string | null }[];
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  cast: CastMember[];
  director: string;
  reviews: Review[];
  related: Movie[];
}

/* ─── Sample Reviews ──────────────────────────────────────── */

const SAMPLE_REVIEWS: Review[] = [
  { id: 's1', author: 'Abhilash G', content: '"Absolutely loved this film! The storytelling is gripping and the visuals are stunning. One of the best watches this year."', author_details: { rating: 9 } },
  { id: 's2', author: 'Kishore N', content: '"A masterclass in filmmaking. The performances are top-notch and the direction is flawless."', author_details: { rating: 8 } },
  { id: 's3', author: 'Priya M', content: '"This movie takes you on an emotional rollercoaster. Watch it with your family — you won\'t regret it!"', author_details: { rating: 9 } },
];

const FALLBACK_TRAILER_KEYS: Record<number, string> = {
  27205: 'YoHD9XEInc0',
  155: 'EXeTwQWrcwY',
  157336: 'zSWdZVtXT7E',
  299536: '6ZfuNTqbHE8',
  603: 'vKQi3bBA1y8',
  278: '6hB3S9bIaco'
};

const buildYouTubeEmbedUrl = (videoKey: string, muted: boolean) => {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '1',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    fs: '1',
    enablejsapi: '1',
    origin: window.location.origin
  });

  return `https://www.youtube.com/embed/${videoKey}?${params.toString()}`;
};

const getYouTubeWatchUrl = (videoKey: string) => `https://www.youtube.com/watch?v=${videoKey}&autoplay=1`;
const getYouTubeThumbnailUrl = (videoKey: string) => `https://img.youtube.com/vi/${videoKey}/maxresdefault.jpg`;

const getDefaultTmdbKey = () => ((import.meta as any).env?.VITE_TMDB_API_KEY || '').trim();

/* ─── Helper: format currency ─────────────────────────────── */
const formatCurrency = (usd?: number | null) => {
  const n = Number(usd);
  if (!Number.isFinite(n) || n <= 0) return 'Not reported';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    notation: n * 83.5 > 10_000_000 ? 'compact' : 'standard'
  }).format(n * 83.5);
};

/* ─── Actor Credit Card (with streaming platforms) ────────── */
interface CreditCardProps {
  movie: PersonMovieCredit;
  apiKey: string;
  theme: Theme;
  onMovieClick: (movie: PersonMovieCredit) => void;
}

const CreditCard: React.FC<CreditCardProps> = ({ movie, apiKey, theme, onMovieClick }) => {
  const [providers, setProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    if (!apiKey || !movie.id) return;
    TMDB.getWatchProviders(apiKey, movie.id)
      .then((data: any) => {
        const region = data?.results?.IN || data?.results?.US || Object.values(data?.results || {})[0] as any;
        const list: WatchProvider[] = [
          ...(region?.flatrate || []),
          ...(region?.rent || []),
          ...(region?.buy || []),
        ];
        // deduplicate by provider_id
        const seen = new Set<number>();
        setProviders(list.filter(p => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true; }).slice(0, 3));
      })
      .catch(() => { });
  }, [movie.id, apiKey]);

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`watch ${movie.title} online streaming`)}`;

  return (
    <div
      onClick={() => onMovieClick(movie)}
      className={`group rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] cursor-pointer ${theme === Theme.DARK ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}
    >
      {/* Poster */}
      <div className="aspect-[2/3] overflow-hidden relative">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt={movie.title}
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${theme === Theme.DARK ? 'bg-white/5 text-white/20' : 'bg-slate-200 text-slate-400'}`}>
            <Users size={28} />
          </div>
        )}
        {/* Star badge */}
        {movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <Star size={9} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[9px] text-white font-bold">{movie.vote_average.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Title + year */}
        <p className={`text-[10px] font-black uppercase tracking-tight line-clamp-2 leading-tight ${theme === Theme.DARK ? 'text-white/90' : 'text-slate-900'}`}>
          {movie.title}
        </p>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>
          {movie.release_date?.split('-')[0] || 'N/A'}
          {movie.character ? ` · ${movie.character}` : ''}
        </p>

        {/* Streaming platforms */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
          {providers.length > 0
            ? providers.map(p => (
              <a
                key={p.provider_id}
                href={`https://www.google.com/search?q=${encodeURIComponent(`watch ${movie.title} on ${p.provider_name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={p.provider_name}
              >
                <img
                  src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                  className="w-6 h-6 rounded-md object-cover border border-white/10 hover:scale-110 transition-transform"
                  alt={p.provider_name}
                />
              </a>
            ))
            : (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${theme === Theme.DARK ? 'border-yellow-500/40 text-yellow-400' : 'border-yellow-600 text-yellow-600'}`}
              >
                Find to Watch
              </a>
            )
          }
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────── */

const MovieDetailModal: React.FC = () => {
  const { selectedMovie, setSelectedMovie, auth, lang, autoPlayTrailer, t, theme, systemKey } = useApp();

  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [providers, setProviders] = useState<WatchProvidersData | null>(null);
  const [extendedDetails, setExtDetails] = useState<MovieExtendedDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isWatched, setIsWatched] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted
  const [showEmbeddedPlayer, setShowEmbeddedPlayer] = useState(false);
  const progressTimer = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Actor state
  const [actorId, setActorId] = useState<number | null>(null);
  const [actorPerson, setActorPerson] = useState<PersonDetails | null>(null);
  const [actorCredits, setActorCredits] = useState<PersonMovieCredit[]>([]);
  const [actorLoading, setActorLoading] = useState(false);
  const [actorError, setActorError] = useState<string | null>(null);

  /* ── Load movie data ── */
  useEffect(() => {
    if (!selectedMovie) return;

    if (modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });

    if (auth.isAuthenticated && auth.user) {
      DB.history.exists(auth.user.id, selectedMovie.id).then(setIsWatched);
    }

    setError(null);
    setProviders(null);
    setExtDetails(null);
    setVideoKey(null);
    setIsPlaying(false);
    setShowEmbeddedPlayer(false);
    setProgress(0);
    setActorId(null);
    setActorPerson(null);
    setActorCredits([]);
    setActorError(null);

    const apiKey = (systemKey || '').trim() || getDefaultTmdbKey();
    if (!apiKey) {
      const fallbackKey = FALLBACK_TRAILER_KEYS[selectedMovie.id] || null;
      setVideoKey(fallbackKey);
      if (autoPlayTrailer && fallbackKey) {
        setIsMuted(true);
        setIsPlaying(true);
        setShowEmbeddedPlayer(true);
      }
      return;
    }

    setLoading(true);
    
    const isTv = selectedMovie.media_type === 'tv';

    // Priority 1: Load trailer first (most important for UX)
    const videoPromise = isTv 
      ? TMDB.getTVShowVideos(apiKey, selectedMovie.id)
      : TMDB.getMovieVideos(apiKey, selectedMovie.id);

    videoPromise
      .then(videoData => {
        const videos = videoData.results || [];
        const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
          || videos.find((v: any) => v.site === 'YouTube');
        const trailerKey = trailer?.key || FALLBACK_TRAILER_KEYS[selectedMovie.id] || null;
        setVideoKey(trailerKey);
        if (autoPlayTrailer && trailerKey) {
          setIsMuted(true);
          setIsPlaying(true);
          setShowEmbeddedPlayer(true);
        }
      })
      .catch(err => {
        console.error(err);
        const fallbackKey = FALLBACK_TRAILER_KEYS[selectedMovie.id] || null;
        setVideoKey(fallbackKey);
        if (autoPlayTrailer && fallbackKey) {
          setIsMuted(true);
          setIsPlaying(true);
          setShowEmbeddedPlayer(true);
        }
      });

    // Priority 2: Load watch providers
    const providersPromise = isTv
      ? TMDB.getTVShowWatchProviders(apiKey, selectedMovie.id)
      : TMDB.getWatchProviders(apiKey, selectedMovie.id);

    providersPromise
      .then(providerData => {
        const results = providerData.results || {};
        const wp = results.IN || results.US || (Object.values(results)[0] as any);
        if (wp) setProviders(wp as WatchProvidersData);
      })
      .catch(console.error);

    // Priority 3: Load details, credits, reviews and recommendations
    const detailsPromise = isTv ? TMDB.getTVShowDetails(apiKey, selectedMovie.id) : TMDB.getMovieDetails(apiKey, selectedMovie.id);
    const creditsPromise = isTv ? TMDB.getTVShowCredits(apiKey, selectedMovie.id) : TMDB.getMovieCredits(apiKey, selectedMovie.id);
    const reviewsPromise = isTv ? TMDB.getTVShowReviews(apiKey, selectedMovie.id) : TMDB.getMovieReviews(apiKey, selectedMovie.id);
    const recommendationsPromise = isTv ? TMDB.getTVShowRecommendations(apiKey, selectedMovie.id) : TMDB.getMovieRecommendations(apiKey, selectedMovie.id);

    Promise.all([
      detailsPromise,
      creditsPromise,
      reviewsPromise,
      recommendationsPromise,
    ])
      .then(([detailsData, creditsData, reviewsData, recsData]) => {
        const crew: CrewMember[] = creditsData.crew || [];
        // For TV shows, the director might be under 'created_by' or a specific job
        const director = isTv 
          ? (detailsData.created_by?.[0]?.name || crew.find(c => c.job === 'Executive Producer')?.name || 'Showrunner')
          : (crew.find(c => c.job === 'Director')?.name || 'Unknown');

        const rawReviews: Review[] = (reviewsData.results || []).slice(0, 3);

        setExtDetails({
          runtime: isTv ? (detailsData.episode_run_time?.[0] || null) : detailsData.runtime,
          budget: detailsData.budget || 0,
          revenue: detailsData.revenue || 0,
          production_companies: detailsData.production_companies || [],
          spoken_languages: detailsData.spoken_languages || [],
          cast: (creditsData.cast || []).slice(0, 15),
          director,
          reviews: rawReviews.length > 0 ? rawReviews : SAMPLE_REVIEWS,
          related: (recsData.results || []).map((m: any) => ({
            ...m,
            title: m.title || m.name,
            original_title: m.original_title || m.original_name,
            release_date: m.release_date || m.first_air_date,
            media_type: isTv ? 'tv' : 'movie'
          })).filter((m: Movie) => m.poster_path).slice(0, 12),
        });
      })
      .catch(err => {
        console.error('Movie modal error:', err);
        setError('Failed to load details. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [selectedMovie, systemKey, autoPlayTrailer, auth.isAuthenticated, auth.user]);

  /* ── Progress timer ── */
  useEffect(() => {
    if (isPlaying) {
      progressTimer.current = window.setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.05), 1000);
    } else if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [isPlaying]);

  /* ── Toggle watched ── */
  const toggleWatched = () => {
    if (!auth.isAuthenticated || !auth.user || !selectedMovie) return;
    if (isWatched) { DB.history.remove(auth.user.id, selectedMovie.id); setIsWatched(false); }
    else { DB.history.add(auth.user.id, selectedMovie.id); setIsWatched(true); }
    TMDB.invalidateTags(['recommendations']);
  };

  /* ── Cast click: fetch actor details ── */
  const handleCastClick = async (person: CastMember) => {
    const apiKey = (systemKey || '').trim() || getDefaultTmdbKey();
    if (!apiKey) return;
    setActorId(person.id);
    setActorPerson(null);
    setActorCredits([]);
    setActorError(null);
    setActorLoading(true);
    try {
      const [details, credits] = await Promise.all([
        TMDB.getPersonDetails(apiKey, person.id),
        TMDB.getPersonMovieCredits(apiKey, person.id),
      ]);
      setActorPerson(details as PersonDetails);
      const cast = (credits?.cast || []) as PersonMovieCredit[];
      setActorCredits(
        cast
          .filter(m => m.poster_path)
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 16)
      );
    } catch (e) {
      console.error('Failed to load actor:', e);
      setActorError('Could not load actor details. Please try again.');
    } finally {
      setActorLoading(false);
    }
  };

  const closeActor = () => { setActorId(null); setActorPerson(null); setActorCredits([]); setActorError(null); };

  /* ── Watch URL ── */
  const watchUrl = (title?: string, platform?: string) => {
    const q = platform ? `watch ${title} on ${platform}` : `watch ${title} online streaming`;
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  };

  const startTrailer = () => {
    if (!videoKey) return;
    setIsMuted(true);
    setIsPlaying(true);
    setShowEmbeddedPlayer(true);
  };

  const openTrailerOnYouTube = () => {
    if (!videoKey) return;

    const opened = window.open(getYouTubeWatchUrl(videoKey), '_blank');
    if (opened) {
      opened.opener = null;
      return;
    }

    window.location.assign(getYouTubeWatchUrl(videoKey));
  };

  const primaryProvider = providers?.flatrate?.[0] || providers?.rent?.[0] || providers?.buy?.[0];

  if (!selectedMovie) return null;

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <>
      {/* ═══ MAIN MOVIE MODAL ═══ */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMovie(null)} />

        <div className={`relative w-full max-w-6xl rounded-[2.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.4)] border animate-in zoom-in-95 duration-500 flex flex-col max-h-[92vh]`} style={{ backgroundColor: 'var(--theme-background)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)', color: 'var(--theme-text)' }}>

          {/* Close button */}
          <button
            onClick={() => setSelectedMovie(null)}
            className={`absolute top-6 right-6 z-[80] p-3 rounded-full border transition-all ${theme === Theme.DARK ? 'bg-black/60 hover:bg-black text-white border-white/10' : 'bg-white/80 hover:bg-slate-100 text-slate-800 border-slate-200'}`}
          >
            <X size={22} />
          </button>

          {/* Player mode */}
          {isPlaying && videoKey ? (
            <div className="relative aspect-video w-full bg-black">
              {showEmbeddedPlayer ? (
                <YouTubePlayer
                  key={videoKey}
                  videoId={videoKey}
                  autoplay
                  muted={isMuted}
                  className="absolute inset-0 h-full w-full"
                  title="Trailer"
                />
              ) : (
                <div className="absolute inset-0">
                  <img
                    src={getYouTubeThumbnailUrl(videoKey)}
                    alt={`${selectedMovie.title} trailer`}
                    className="w-full h-full object-cover opacity-70"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
                    <button
                      onClick={() => {
                        setIsMuted(true);
                        setShowEmbeddedPlayer(true);
                      }}
                      className="w-24 h-24 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow-2xl shadow-yellow-500/20 hover:scale-105 transition-transform"
                      aria-label="Play trailer"
                    >
                      <Play fill="currentColor" size={42} className="ml-1" />
                    </button>
                    <div>
                      <p className="text-white text-xl md:text-2xl font-black uppercase tracking-tight">Play Trailer</p>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2">YouTube player will open here</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Mute/Unmute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-6 right-20 z-[70] p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all group"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black">
                <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="relative z-[90] flex flex-wrap gap-3">
                  <button onClick={() => setIsPlaying(false)} className="bg-yellow-500 text-black px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs">
                    Close Player
                  </button>
                  <button
                    type="button"
                    onClick={openTrailerOnYouTube}
                    className="bg-white/10 text-white border border-white/15 px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-colors"
                  >
                    Open on YouTube
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Scroll content */
            <div ref={modalRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
              <div className="flex flex-col md:flex-row min-h-full">

                {/* ── Left: Poster ── */}
                <div className="relative w-full md:w-2/5 shrink-0">
                  <img
                    src={`https://image.tmdb.org/t/p/w780${selectedMovie.poster_path}`}
                    className="w-full h-full object-cover min-h-[400px] md:min-h-[600px]"
                    alt={selectedMovie.title}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${theme === Theme.DARK ? 'from-[#141414]' : 'from-white'}`} />
                  {/* Play button - show when trailer is loaded */}
                  {videoKey && (
                    <button onClick={startTrailer} className="absolute inset-0 flex items-center justify-center group">
                      <div className="w-20 h-20 bg-yellow-500 text-black rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                        <Play fill="currentColor" size={34} className="ml-2" />
                      </div>
                    </button>
                  )}
                  {/* Loading indicator - small and non-blocking */}
                  {loading && !videoKey && (
                    <div className="absolute bottom-6 right-6">
                      <Loader2 className="animate-spin text-yellow-500" size={32} />
                    </div>
                  )}
                </div>

                {/* ── Right: Info ── */}
                <div className="flex-1 p-8 md:p-12 space-y-10 pb-24">

                  {/* Badges */}
                  <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-yellow-500 text-black px-3 py-1.5 rounded-lg">
                      <Star size={12} className="fill-current" /> {selectedMovie.vote_average.toFixed(1)}
                    </span>
                    <span className={`flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-500'}`}>
                      <Calendar size={12} /> {selectedMovie.release_date}
                    </span>
                    <span className={`flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-500'}`}>
                      <Globe2 size={12} /> {selectedMovie.original_language.toUpperCase()}
                    </span>
                    {extendedDetails?.runtime && (
                      <span className={`flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-500'}`}>
                        <Clock size={12} /> {extendedDetails.runtime} min
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className={`text-4xl md:text-5xl font-black tracking-tighter leading-tight uppercase ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>
                    {selectedMovie.title}
                  </h2>

                  {/* Genres */}
                  <div className="flex flex-wrap gap-2">
                    {selectedMovie.genre_ids.map(id => (
                      <span key={id} className={`px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest ${theme === Theme.DARK ? 'bg-white/5 border-white/10 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        {GENRES[id]}
                      </span>
                    ))}
                  </div>

                  {/* Overview */}
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.3em] mb-3 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}>Overview</p>
                    <p className={`text-base leading-relaxed italic ${theme === Theme.DARK ? 'text-white/60' : 'text-slate-600'}`}>"{selectedMovie.overview}"</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                      <AlertCircle size={18} /> <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Loading skeleton for extended details */}
                  {loading && !extendedDetails && (
                    <div className="space-y-8 animate-pulse">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                          <div key={i}>
                            <div className={`h-2 w-16 mb-2 rounded ${theme === Theme.DARK ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            <div className={`h-4 w-24 rounded ${theme === Theme.DARK ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                          </div>
                        ))}
                      </div>
                      <div className={`h-32 rounded-2xl ${theme === Theme.DARK ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                    </div>
                  )}

                  {extendedDetails && (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}><UserCheck size={11} /> Director</p>
                          <p className={`text-sm font-black ${theme === Theme.DARK ? 'text-white/80' : 'text-slate-900'}`}>{extendedDetails.director}</p>
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}><Wallet size={11} /> Budget</p>
                          <p className={`text-sm font-black ${theme === Theme.DARK ? 'text-white/80' : 'text-slate-900'}`}>{formatCurrency(extendedDetails.budget)}</p>
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}><Landmark size={11} /> Revenue</p>
                          <p className="text-sm font-black text-yellow-500">{formatCurrency(extendedDetails.revenue)}</p>
                        </div>
                      </div>

                      {/* Where to Watch */}
                      {providers && (
                        <div className={`p-6 rounded-2xl border ${theme === Theme.DARK ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                          <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>
                            <Monitor size={12} className="text-yellow-500" /> Where to Watch
                          </p>
                          <div className="flex flex-wrap gap-6">
                            {(['flatrate', 'rent', 'buy'] as const).map(type => {
                              const list = providers[type];
                              if (!list?.length) return null;
                              return (
                                <div key={type}>
                                  <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}>{type}</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {list.map(p => (
                                      <a key={p.provider_id} href={watchUrl(selectedMovie.title, p.provider_name)} target="_blank" rel="noopener noreferrer" title={p.provider_name} className="hover:scale-110 transition-transform block">
                                        <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} className="w-10 h-10 rounded-xl shadow-md border border-white/10" alt={p.provider_name} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Cast */}
                      {extendedDetails.cast.length > 0 && (
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-7 bg-yellow-500 rounded-full" />
                            <h3 className={`text-xl font-black tracking-tighter uppercase ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>Main Cast</h3>
                            <span className={`text-[9px] font-black uppercase tracking-widest ml-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>(tap to see filmography)</span>
                          </div>
                          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x">
                            {extendedDetails.cast.map(person => (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() => handleCastClick(person)}
                                className="w-24 shrink-0 group text-center snap-start cursor-pointer"
                              >
                                <div className={`relative aspect-square rounded-full overflow-hidden mb-2 border-2 transition-all group-hover:scale-105 group-hover:border-yellow-500 ${theme === Theme.DARK ? 'border-white/10' : 'border-slate-200'}`}>
                                  {person.profile_path ? (
                                    <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} className="w-full h-full object-cover" alt={person.name} />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${theme === Theme.DARK ? 'bg-white/5 text-white/30' : 'bg-slate-200 text-slate-400'}`}><Users size={22} /></div>
                                  )}
                                </div>
                                <p className={`text-[9px] font-black uppercase tracking-tight line-clamp-1 leading-tight ${theme === Theme.DARK ? 'text-white/90' : 'text-slate-900'}`}>{person.name}</p>
                                <p className={`text-[8px] font-bold uppercase tracking-widest line-clamp-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>{person.character}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reviews */}
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-7 bg-green-500 rounded-full" />
                          <h3 className={`text-xl font-black tracking-tighter uppercase ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>Customer Reviews</h3>
                        </div>
                        <div className="space-y-4">
                          {extendedDetails.reviews.map(r => (
                            <div key={r.id} className={`p-5 rounded-2xl border ${theme === Theme.DARK ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${theme === Theme.DARK ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {r.author[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className={`font-black text-sm ${theme === Theme.DARK ? 'text-white/80' : 'text-slate-900'}`}>{r.author}</p>
                                  {r.author_details.rating && (
                                    <div className="flex items-center gap-1">
                                      {[...Array(Math.min(Math.round(r.author_details.rating / 2), 5))].map((_, i) => (
                                        <Star key={i} size={10} className="text-yellow-500 fill-yellow-500" />
                                      ))}
                                      <span className={`text-[10px] ml-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>{r.author_details.rating}/10</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className={`text-sm leading-relaxed italic ${theme === Theme.DARK ? 'text-white/60' : 'text-slate-600'}`}>
                                {r.content.slice(0, 300)}{r.content.length > 300 ? '…' : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Languages & Companies */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}><Languages size={11} /> Spoken Languages</p>
                          <div className="flex flex-wrap gap-2">
                            {extendedDetails.spoken_languages.map((l, i) => (
                              <span key={i} className={`px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${theme === Theme.DARK ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-50 border-indigo-100 text-indigo-600'}`}>
                                {l.english_name || l.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}><Briefcase size={11} /> Production Companies</p>
                          <div className="flex flex-wrap gap-3 items-center">
                            {extendedDetails.production_companies.map(c => (
                              <div key={c.id}>
                                {c.logo_path ? (
                                  <div className={`p-1.5 rounded-lg border bg-white/10 ${theme === Theme.DARK ? 'border-white/5' : 'border-slate-200'}`}>
                                    <img src={`https://image.tmdb.org/t/p/w92${c.logo_path}`} className="h-7 object-contain grayscale hover:grayscale-0 transition-all" alt={c.name} title={c.name} />
                                  </div>
                                ) : (
                                  <span className={`text-[8px] font-black uppercase tracking-tight px-2 py-1 rounded-lg border ${theme === Theme.DARK ? 'bg-white/5 border-white/10 text-white/30' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{c.name}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Related Movies */}
                      {extendedDetails.related.length > 0 && (
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-7 bg-indigo-500 rounded-full" />
                            <h3 className={`text-xl font-black tracking-tighter uppercase ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>Related Movies</h3>
                          </div>
                          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar snap-x">
                            {extendedDetails.related.map(movie => (
                              <div key={movie.id} className="snap-start shrink-0">
                                <MovieCard movie={movie} variant="compact" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          {!isPlaying && (
            <div className={`px-8 md:px-12 py-5 border-t flex flex-wrap gap-4 items-center justify-between`} style={{ backgroundColor: 'var(--theme-background)', borderTopColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <button
                onClick={() => window.open(watchUrl(selectedMovie.title, primaryProvider?.provider_name), '_blank')}
                className="bg-yellow-500 text-black px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 active:scale-95 text-xs uppercase tracking-widest"
              >
                <ExternalLink size={18} />
                {primaryProvider ? `Watch on ${primaryProvider.provider_name}` : 'Watch Now'}
              </button>
              <div className="flex gap-3">
                {auth.isAuthenticated && (
                  <button onClick={toggleWatched} className={`p-3.5 rounded-2xl border-2 transition-all active:scale-95 ${isWatched ? 'bg-green-500/10 border-green-500 text-green-500' : `border-slate-300 text-slate-400 hover:border-yellow-500 ${theme === Theme.DARK ? 'bg-white/5' : 'bg-slate-50'}`}`}>
                    {isWatched ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                )}
                <button className={`p-3.5 rounded-2xl border-2 transition-all active:scale-95 ${theme === Theme.DARK ? 'bg-white/5 border-white/10 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-yellow-500'}`}>
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ACTOR PANEL — z-250, outside main modal ═══ */}
      {actorId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={closeActor} />

          <div className={`relative w-full max-w-5xl rounded-[2.5rem] border shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar flex flex-col ${theme === Theme.DARK ? 'bg-[#0e0e0e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>

            {/* Close */}
            <div className="sticky top-0 z-10 flex justify-end p-5">
              <button
                onClick={closeActor}
                className={`p-3 rounded-full border transition-all ${theme === Theme.DARK ? 'bg-black/60 hover:bg-black text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-10 space-y-10 -mt-4">

              {/* Actor header */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Photo */}
                <div className="w-36 md:w-48 shrink-0 mx-auto md:mx-0">
                  <div className={`aspect-[2/3] rounded-3xl overflow-hidden border shadow-xl ${theme === Theme.DARK ? 'border-white/10' : 'border-slate-200'}`}>
                    {actorPerson?.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w500${actorPerson.profile_path}`} className="w-full h-full object-cover" alt={actorPerson.name} />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${theme === Theme.DARK ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'}`}>
                        <Users size={36} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-5">
                  {actorLoading ? (
                    <div className="flex items-center gap-3 text-yellow-500"><Loader2 className="animate-spin" size={24} /> Loading actor info…</div>
                  ) : actorError ? (
                    <div className="flex items-center gap-3 text-red-500"><AlertCircle size={20} /> {actorError}</div>
                  ) : actorPerson ? (
                    <>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>Actor Profile</p>
                        <h2 className={`text-3xl md:text-4xl font-black tracking-tighter ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>{actorPerson.name}</h2>
                        <div className={`flex flex-wrap gap-4 mt-2 text-[10px] font-black uppercase tracking-widest ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-500'}`}>
                          {actorPerson.known_for_department && <span>{actorPerson.known_for_department}</span>}
                          {actorPerson.birthday && <span>Born {actorPerson.birthday}</span>}
                          {actorPerson.place_of_birth && <span>{actorPerson.place_of_birth}</span>}
                        </div>
                      </div>

                      {actorPerson.biography && actorPerson.biography.length > 10 && (
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-2 ${theme === Theme.DARK ? 'text-white/20' : 'text-slate-400'}`}>Biography</p>
                          <p className={`text-sm leading-relaxed ${theme === Theme.DARK ? 'text-white/65' : 'text-slate-600'}`}>
                            {actorPerson.biography.slice(0, 600)}{actorPerson.biography.length > 600 ? '…' : ''}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`flex items-center gap-3 ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-400'}`}><Loader2 className="animate-spin" size={20} /> Loading…</div>
                  )}
                </div>
              </div>

              {/* Filmography grid (with streaming platform per film) */}
              {!actorLoading && actorCredits.length > 0 && systemKey && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-7 bg-yellow-500 rounded-full" />
                    <h3 className={`text-xl font-black tracking-tighter uppercase ${theme === Theme.DARK ? 'text-white' : 'text-slate-900'}`}>Filmography</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest ml-1 ${theme === Theme.DARK ? 'text-white/30' : 'text-slate-400'}`}>(hover to see streaming platforms)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {actorCredits.map(movie => (
                      <CreditCard
                        key={movie.id}
                        movie={movie}
                        apiKey={systemKey}
                        theme={theme}
                        onMovieClick={async (m) => {
                          if (!systemKey) return;
                          try {
                            setLoading(true);
                            const fullMovie = await TMDB.getMovieDetails(systemKey, m.id);
                            // Ensure it has some required fields if missing from credit
                            const movieToSelect = {
                              ...fullMovie,
                              genre_ids: fullMovie.genres?.map((g: any) => g.id) || []
                            };
                            setSelectedMovie(movieToSelect);
                            closeActor();
                          } catch (err) {
                            console.error("Failed to open movie from cast:", err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!actorLoading && actorCredits.length === 0 && !actorError && actorPerson && (
                <p className={`text-sm ${theme === Theme.DARK ? 'text-white/40' : 'text-slate-400'}`}>No notable film credits found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MovieDetailModal;
