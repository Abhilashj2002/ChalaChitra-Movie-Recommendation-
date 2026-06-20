import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { normalizeSearchResults, TMDB } from '../services/tmdb';
import { SimpleDB as DB } from '../services/simpleDb';
import { Movie, Language, Theme } from '../types';
import { RefreshCw, Search as SearchIcon, ShieldAlert, Play, Info, Star, Filter, ChevronLeft, ChevronRight, MessageSquareText, MessageCircle, X, Mail, Send, UserCheck, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GENRES } from '../constants';
import EnhancedChatbot from '../components/EnhancedChatbot';
import YouTubePlayer, { YouTubePlayerHandle } from '../components/YouTubePlayer';

const FEEDBACK_SAMPLES = [
  { id: 1, user: "Abhilash G", avatar: "AG", rating: 5, comment: "ChalaChitra is my daily go-to for movies. The interface is stunning!", movie: "The Dark Knight" },
  { id: 2, user: "Kishore N", avatar: "KN", rating: 4, comment: "Love the hero slider feature. Makes finding what to watch so easy.", movie: "Inception" },
  { id: 3, user: "Priya M", avatar: "PM", rating: 5, comment: "The trailer preview is a game changer. No more guessing if a movie is good.", movie: "Interstellar" },
  { id: 4, user: "Suresh K", avatar: "SK", rating: 5, comment: "Best movie companion app I've used. Periodic updates keep it fresh.", movie: "Leo" },
];

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'kn', label: 'Kannada' },
  { code: 'te', label: 'Telugu' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' }
];

const LANGUAGE_CARDS = [
  // Indian Languages
  { code: 'kn', name: 'Kannada', flag: '🇮🇳', gradient: 'from-red-600 to-orange-600' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳', gradient: 'from-blue-600 to-cyan-600' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', gradient: 'from-green-600 to-emerald-600' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', gradient: 'from-purple-600 to-pink-600' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳', gradient: 'from-yellow-600 to-amber-600' },
  // Asian Languages
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', gradient: 'from-red-500 to-rose-500' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', gradient: 'from-indigo-500 to-blue-500' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', gradient: 'from-red-700 to-yellow-700' },
  // European Languages
  { code: 'en', name: 'English', flag: '🇺🇸', gradient: 'from-slate-600 to-gray-600' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', gradient: 'from-red-500 to-yellow-500' },
  { code: 'fr', name: 'French', flag: '🇫🇷', gradient: 'from-blue-700 to-red-700' },
  { code: 'de', name: 'German', flag: '🇩🇪', gradient: 'from-yellow-600 to-red-600' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', gradient: 'from-green-600 to-red-600' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', gradient: 'from-green-600 to-red-700' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', gradient: 'from-blue-700 to-red-700' },
];

const FALLBACK_MOVIES: Movie[] = [
  {
    id: 27205,
    title: 'Inception',
    original_title: 'Inception',
    overview: 'A skilled thief enters dreams to steal secrets and attempts one final impossible mission.',
    poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    release_date: '2010-07-15',
    vote_average: 8.4,
    genre_ids: [28, 878, 53],
    popularity: 120.0,
    original_language: 'en'
  },
  {
    id: 155,
    title: 'The Dark Knight',
    original_title: 'The Dark Knight',
    overview: 'Batman battles the Joker in Gotham City while pushing his moral limits.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
    release_date: '2008-07-16',
    vote_average: 8.5,
    genre_ids: [28, 80, 18],
    popularity: 110.0,
    original_language: 'en'
  },
  {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    overview: 'A team of explorers travels through a wormhole in space to ensure humanity survives.',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    release_date: '2014-11-05',
    vote_average: 8.4,
    genre_ids: [12, 18, 878],
    popularity: 108.0,
    original_language: 'en'
  },
  {
    id: 299536,
    title: 'Avengers: Infinity War',
    original_title: 'Avengers: Infinity War',
    overview: 'The Avengers and allies unite to stop Thanos from collecting all Infinity Stones.',
    poster_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
    backdrop_path: '/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg',
    release_date: '2018-04-25',
    vote_average: 8.2,
    genre_ids: [12, 28, 878],
    popularity: 105.0,
    original_language: 'en'
  },
  {
    id: 603,
    title: 'The Matrix',
    original_title: 'The Matrix',
    overview: 'A hacker discovers the shocking reality behind his world and joins a rebellion.',
    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop_path: '/icmmSD4vTTDKOq2vvdulafOGw93.jpg',
    release_date: '1999-03-30',
    vote_average: 8.2,
    genre_ids: [28, 878],
    popularity: 95.0,
    original_language: 'en'
  },
  {
    id: 278,
    title: 'The Shawshank Redemption',
    original_title: 'The Shawshank Redemption',
    overview: 'Two imprisoned men bond over years, finding redemption through acts of decency.',
    poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    backdrop_path: '/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg',
    release_date: '1994-09-23',
    vote_average: 8.7,
    genre_ids: [18, 80],
    popularity: 90.0,
    original_language: 'en'
  }
];

const FALLBACK_TRAILER_KEYS: Record<number, string> = {
  27205: 'YoHD9XEInc0',
  155: 'EXeTwQWrcwY',
  157336: 'zSWdZVtXT7E',
  299536: '6ZfuNTqbHE8',
  603: 'vKQi3bBA1y8',
  278: '6hB3S9bIaco'
};

const HomePage: React.FC = () => {
  const { auth, t, lang, setSelectedMovie, theme, toggleTheme, systemKey } = useApp();
  const navigate = useNavigate();

  const isDark = theme === Theme.DARK;

  const [trending, setTrending] = useState<Movie[]>([]);
  const [priorityPicks, setPriorityPicks] = useState<Movie[]>([]);
  const [gems, setGems] = useState<Movie[]>([]);
  const [forYou, setForYou] = useState<Movie[]>([]);
  const [kannadaMovies, setKannadaMovies] = useState<Movie[]>([]);
  const [teluguMovies, setTeluguMovies] = useState<Movie[]>([]);
  const [hindiMovies, setHindiMovies] = useState<Movie[]>([]);
  const [malayalamMovies, setMalayalamMovies] = useState<Movie[]>([]);
  const [blockbusters, setBlockbusters] = useState<Movie[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<Movie[]>([]);
  const [anime, setAnime] = useState<Movie[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [activeItem, setActiveItem] = useState<Movie | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dedicated state for fetching 200+ movies from TMDB on filter trigger
  const [quickFilteredMovies, setQuickFilteredMovies] = useState<Movie[]>([]);
  const [isQuickFilterLoading, setIsQuickFilterLoading] = useState(false);

  // Feedback state
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const feedbackTimer = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  // Pre-fetched trailer key cache: movieId -> youtubeKey
  const trailerCache = useRef<Record<number, string | null>>({});
  // Ref to the hero player iframe so we can mute/unmute without remounting
  const heroPlayerRef = useRef<YouTubePlayerHandle>(null);

  // Admin controlled UI state
  const [hpFeedbackEnabled, setHpFeedbackEnabled] = useState(true);
  const [hpHeroSliderEnabled, setHpHeroSliderEnabled] = useState(true);
  const [hpFiltersEnabled, setHpFiltersEnabled] = useState(true);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);

  // Hero trailer mute state
  const [isTrailerMuted, setIsTrailerMuted] = useState(true); // Default muted

  // All movies state for proper filtering
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  
  // Real feedback from DB
  const [realFeedback, setRealFeedback] = useState<any[]>([]);

  const getTmdbKey = () => {
    const envKey = ((import.meta as any).env?.VITE_TMDB_API_KEY || '').trim();
    const currentKey = (systemKey || '').trim();
    return currentKey || envKey;
  };

  const getVideosForItem = (apiKey: string, item: Movie) => {
    return item.media_type === 'tv'
      ? TMDB.getTVShowVideos(apiKey, item.id)
      : TMDB.getMovieVideos(apiKey, item.id);
  };



  const applyFallbackContent = () => {
    const base = FALLBACK_MOVIES;
    setTrending(base);
    setPriorityPicks(base);
    setGems(base);
    setForYou(base);
    setKannadaMovies(base);
    setTeluguMovies(base);
    setHindiMovies(base);
    setMalayalamMovies(base);
    setBlockbusters(base);
    setRecentlyWatched([]);
    setAnime(base);
    setAllMovies(base);
    setActiveItem(base[0] || null);
  };

  const preferencesSignature = JSON.stringify(auth.user?.preferences || {});

  useEffect(() => {
    DB.settings.get('hp_feedback_enabled').then(val => setHpFeedbackEnabled(val !== 'false'));
    DB.settings.get('hp_hero_slider_enabled').then(val => setHpHeroSliderEnabled(val !== 'false'));
    DB.settings.get('hp_filters_enabled').then(val => setHpFiltersEnabled(val !== 'false'));
    DB.settings.get('chatbot_enabled').then(val => setChatbotEnabled(val !== 'false'));
    DB.siteFeedback.getAll().then(setRealFeedback);
  }, []);

  // Combined content for feedback carousel
  const allFeedback = [
    ...FEEDBACK_SAMPLES,
    ...realFeedback.map(f => ({
      id: f.id,
      user: f.name,
      avatar: (f.name || 'U').substring(0, 2).toUpperCase(),
      rating: f.rating || 5,
      comment: f.message,
      movie: 'ChalaChitra'
    }))
  ];

  useEffect(() => {
    if (allFeedback.length === 0) return;
    feedbackTimer.current = window.setInterval(() => {
      setFeedbackIndex(prev => (prev + 1) % allFeedback.length);
    }, 5000);
    return () => { if (feedbackTimer.current) clearInterval(feedbackTimer.current); };
  }, [allFeedback.length]);

  // Effect to fetch up to 200 movies dynamically from TMDB when Quick Filters are used
  useEffect(() => {
    const fetchQuickFilters = async () => {
      if (!selectedGenre && !selectedLanguage) {
        setQuickFilteredMovies([]);
        return;
      }
      setIsQuickFilterLoading(true);
      const apiKey = getTmdbKey();
      if (!apiKey) {
        setIsQuickFilterLoading(false);
        return;
      }
      try {
        // Fetch up to 10 pages (~200 results)
        const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const promises = pages.map(page => {
          const params: any = { sort_by: 'popularity.desc', page: page.toString(), 'vote_count.gte': '10' };
          if (selectedGenre) params.with_genres = selectedGenre.toString();
          if (selectedLanguage) params.with_original_language = selectedLanguage;
          return TMDB.fetch('/discover/movie', apiKey, params, 'discover');
        });
        const results = await Promise.all(promises);
        const combined = results.map(r => r?.results || []).reduce((acc, curr) => acc.concat(curr), []);
        const unique = combined.filter((m: Movie, i: number, self: Movie[]) => self.findIndex(x => x.id === m.id) === i && m.poster_path);
        setQuickFilteredMovies(unique);
      } catch (e) {
        console.error("Quick filter load failed", e);
      } finally {
        setIsQuickFilterLoading(false);
      }
    };
    fetchQuickFilters();
  }, [selectedGenre, selectedLanguage, systemKey]);

  const loadData = async () => {
    const apiKey = getTmdbKey();

    // Always apply fallback content first to ensure page renders
    applyFallbackContent();
    setError(null);

    if (!apiKey) {
      setLoading(false);
      return;
    }

    // Removed setLoading(true) to allow zero-delay visual rendering with fallback data
    setLoading(false);

    try {
      // Stage 1: Load hero/trending first - fetch using TMDB cached service
      const trendDataObj = await TMDB.getTrendingCombined(apiKey, 20);
      const trendData = trendDataObj.results || [];
      
      // Only update if we got valid data
      if (trendData.length > 0) {
        setTrending(trendData);
        setActiveItem(trendData[0]);

        // Pre-warm trailer cache for top 8 trending items in background
        const apiKey2 = getTmdbKey();
        if (apiKey2) {
          trendData.slice(0, 8).forEach(async (item: Movie) => {
            if (trailerCache.current[item.id] !== undefined) return;
            const fallback = FALLBACK_TRAILER_KEYS[item.id] ?? null;
            try {
              const vData = await getVideosForItem(apiKey2, item);
              const t =
                vData.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
                vData.results?.find((v: any) => v.site === 'YouTube');
              trailerCache.current[item.id] = t?.key || fallback;
            } catch {
              trailerCache.current[item.id] = fallback;
            }
          });
        }
      }
      setLoading(false);

      // Stage 2: Load remaining sections in parallel without breaking homepage on partial failures
      try {
        const [gemRes, knRes, teRes, hiRes, mlRes, blockRes, animeRes, historyRes] = await Promise.allSettled([
          TMDB.getHiddenGems(apiKey),
          TMDB.getLanguageMovies(apiKey, Language.KN),
          TMDB.getLanguageMovies(apiKey, Language.TE),
          TMDB.getLanguageMovies(apiKey, Language.HI),
          TMDB.getLanguageMovies(apiKey, Language.ML),
          TMDB.getBlockbusters(apiKey),
          TMDB.fetch('/discover/tv', apiKey, { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' }, 'discover'),
          auth.user?.id ? DB.history.get(auth.user.id) : Promise.resolve([])
        ]);

        const gemData = gemRes.status === 'fulfilled' ? gemRes.value : { results: [] as Movie[] };
        const knData = knRes.status === 'fulfilled' ? knRes.value : { results: [] as Movie[] };
        const teData = teRes.status === 'fulfilled' ? teRes.value : { results: [] as Movie[] };
        const hiData = hiRes.status === 'fulfilled' ? hiRes.value : { results: [] as Movie[] };
        const mlData = mlRes.status === 'fulfilled' ? mlRes.value : { results: [] as Movie[] };
        const blockData = blockRes.status === 'fulfilled' ? blockRes.value : { results: [] as Movie[] };
        const animeRawData = animeRes.status === 'fulfilled' ? animeRes.value.results || [] : [];
        const animeData = { results: animeRawData.map((tv: any) => ({ ...tv, media_type: 'tv' })) };
        const history = historyRes.status === 'fulfilled' ? (historyRes.value as number[]) : [];

        const priorityLang = auth.user?.preferences?.languages?.[0];
        const priorityData = priorityLang
          ? await TMDB.getLanguageMovies(apiKey, priorityLang).catch(() => ({ results: [] as Movie[] }))
          : { results: [] as Movie[] };

        let personalizedResults: Movie[] = [];
        if ((auth.user?.preferences?.languages?.length ?? 0) > 0 && (auth.user?.preferences?.genres?.length ?? 0) > 0) {
          const recResponses = await Promise.allSettled(
            (auth.user?.preferences?.genres || []).map((genreId: number) => TMDB.getGenreMovies(apiKey, [genreId]))
          );
          personalizedResults = recResponses
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .flatMap((r: any) => r.value?.results || []);

          if (priorityLang) {
            personalizedResults = [...priorityData.results.slice(0, 5), ...personalizedResults];
          }
        } else if ((auth.user?.preferences?.genres?.length ?? 0) > 0) {
          const genreData = await TMDB
            .getGenreMovies(apiKey, auth.user?.preferences?.genres || [])
            .catch(() => ({ results: [] as Movie[] }));
          personalizedResults = genreData.results;
        } else {
          personalizedResults = gemData.results;
        }

        const filteredResults = personalizedResults
          .filter((movie, index, self) =>
            self.findIndex(m => m.id === movie.id) === index &&
            !history.includes(movie.id)
          );

        if (priorityLang) {
          filteredResults.sort((a, b) => {
            const aIsPriority = a.original_language === priorityLang;
            const bIsPriority = b.original_language === priorityLang;
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return b.vote_average - a.vote_average;
          });
        } else {
          filteredResults.sort((a, b) => b.popularity - a.popularity);
        }

        const finalForYou = filteredResults.slice(0, 15);

        const allFetchedMovies = [...trendData, ...priorityData.results, ...gemData.results, ...personalizedResults];
        const historyMovies = history.map(id => allFetchedMovies.find(m => m.id === id)).filter(Boolean) as Movie[];
        const uniqueHistory = historyMovies.filter((m, i, s) => s.findIndex(x => x.id === m.id) === i);

        // Combine all movies for filtering (deduplicated)
        const allCombined = [
          ...trendData,
          ...priorityData.results,
          ...gemData.results,
          ...personalizedResults,
          ...knData.results,
          ...teData.results,
          ...hiData.results,
          ...mlData.results,
          ...blockData.results,
          ...animeData.results
        ].filter((movie, index, self) =>
          index === self.findIndex(m => m.id === movie.id)
        );
        setAllMovies(allCombined);

        setPriorityPicks(priorityData.results.slice(0, 10));
        setGems(gemData.results.slice(0, 10));
        setForYou(finalForYou);
        setKannadaMovies(knData.results.slice(0, 10));
        setTeluguMovies(teData.results.slice(0, 10));
        setHindiMovies(hiData.results.slice(0, 10));
        setMalayalamMovies(mlData.results.slice(0, 10));
        setBlockbusters(blockData.results.slice(0, 10));
        setRecentlyWatched(uniqueHistory.slice(0, 10));
        setAnime(animeData.results.slice(0, 10));
      } catch (secondaryError) {
        console.error('HomePage secondary section load failed:', secondaryError);
      }
    } catch (e: any) {
      console.error('HomePage primary TMDB load failed, using fallback content:', e);
      applyFallbackContent();
      setError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [systemKey, auth.user?.id, preferencesSignature]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Trailer when active item changes
  // Strategy: show fallback / cached key INSTANTLY, then upgrade with TMDB result in background
  useEffect(() => {
    if (!activeItem) return;
    let cancelled = false;

    // ── Step 1: Instant display ──────────────────────────────────────────────
    // Use cached key or hardcoded fallback so the iframe starts loading NOW
    const cachedKey = trailerCache.current[activeItem.id];
    const fallbackKey = FALLBACK_TRAILER_KEYS[activeItem.id] ?? null;
    const immediateKey = cachedKey !== undefined ? cachedKey : fallbackKey;

    setIsTrailerMuted(true);
    setTrailerKey(immediateKey);
    setIsPlaying(!!immediateKey);

    // ── Step 2: Background TMDB fetch (upgrade quality) ──────────────────────
    const fetchTrailer = async () => {
      // Already have a TMDB-sourced cached key — no need to refetch
      if (cachedKey !== undefined) return;

      try {
        const apiKey = getTmdbKey();
        if (!apiKey) return;

        const data = await getVideosForItem(apiKey, activeItem);
        const youtubeTrailer =
          data.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
          data.results?.find((v: any) => v.site === 'YouTube');
        const finalKey = youtubeTrailer?.key || fallbackKey || null;

        // Store in cache for instant access next time
        trailerCache.current[activeItem.id] = finalKey;

        if (cancelled) return;
        // Only update UI if we found a better key than what's already showing
        if (finalKey !== immediateKey) {
          setTrailerKey(finalKey);
          setIsPlaying(!!finalKey);
        }
      } catch (err) {
        console.error('Failed to load trailer from TMDB, using fallback:', err);
        trailerCache.current[activeItem.id] = fallbackKey;
      }
    };

    fetchTrailer();
    return () => { cancelled = true; };
  }, [activeItem?.id, systemKey]);

  const handleTrailerEnd = useCallback(() => {
    if (!hpHeroSliderEnabled || trending.length < 2) return;
    setActiveItem(current => {
      const currentIndex = trending.findIndex(item => item.id === current?.id);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % trending.length : 0;
      return trending[nextIndex];
    });
  }, [hpHeroSliderEnabled, trending]);

  useEffect(() => {
    if (!hpHeroSliderEnabled || trending.length < 2 || !activeItem) return;
    
    // If we have a trailer, let it play fully and rely on handleTrailerEnd
    // If no trailer exists, use a 12s fallback timer to keep the slider moving
    if (trailerKey) return;

    const timer = window.setInterval(() => {
      handleTrailerEnd();
    }, 12000);

    return () => window.clearInterval(timer);
  }, [activeItem, hpHeroSliderEnabled, trending, trailerKey, handleTrailerEnd]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      performSearch(searchVal);
    }
  };

  const performSearch = async (query: string) => {
    const apiKey = getTmdbKey();
    if (!apiKey || !query.trim()) return;

    const requestId = ++searchRequestIdRef.current;
    setLoading(true);
    setShowSearchResults(true);

    try {
      // Render first page quickly
      const firstPage = await TMDB.searchWithMulti(apiKey, query, 1);
      const firstResults = normalizeSearchResults(firstPage.results || []);
      const uniqueFirst = firstResults.filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id)
      );

      if (requestId !== searchRequestIdRef.current) return;

      // If we have results, show them immediately
      if (uniqueFirst.length > 0) {
        setSearchResults(uniqueFirst);
        setLoading(false);

        // Fetch more in background
        const laterPages = [2, 3, 4, 5];
        const remainingResults = await Promise.allSettled(
          laterPages.map(page => TMDB.searchWithMulti(apiKey, query, page))
        );

        if (requestId !== searchRequestIdRef.current) return;

        const merged = [
          ...firstResults,
          ...remainingResults
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .flatMap(r => normalizeSearchResults(r.value?.results || []))
        ];

        const uniqueResults = merged.filter((movie, index, self) =>
          index === self.findIndex(m => m.id === movie.id)
        );

        setSearchResults(uniqueResults);
      } else {
        // No direct results - fetch related content by genre
        const relatedContent = await TMDB.getRelatedContent(apiKey, query);
        if (requestId === searchRequestIdRef.current) {
          if (relatedContent.length > 0) {
            setSearchResults(relatedContent);
          } else {
            // Final fallback to trending
            const trendingData = await TMDB.getTrendingCombined(apiKey, 20);
            setSearchResults(trendingData.results || []);
          }
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Load related content or trending on error
      if (apiKey) {
        const relatedContent = await TMDB.getRelatedContent(apiKey, query);
        if (requestId === searchRequestIdRef.current) {
          if (relatedContent.length > 0) {
            setSearchResults(relatedContent);
          } else {
            const trendingData = await TMDB.getTrendingCombined(apiKey, 20);
            setSearchResults(trendingData.results || []);
          }
        }
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleResetAppData = async () => {
    try {
      localStorage.removeItem('cm_auth');
      localStorage.removeItem('cm_theme');
      localStorage.removeItem('cm_lang');
      localStorage.removeItem('cinema_mithra_sqlite');
      localStorage.removeItem('cinema_db');
      sessionStorage.clear();

      if (window.indexedDB && window.indexedDB.databases) {
        const databases = await window.indexedDB.databases();
        for (const dbInfo of databases) {
          if (dbInfo.name) {
            window.indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      }
    } catch (resetError) {
      console.error('Failed to fully clear local data:', resetError);
    } finally {
      window.location.reload();
    }
  };

  const changeVideo = (item: Movie) => {
    // Instantly mute and update active item — the trailer useEffect handles the rest
    setIsTrailerMuted(true);
    setActiveItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackMessage.trim() || feedbackRating === 0) {
      setFeedbackStatus({ type: 'error', msg: 'Please provide a name, message, and rating.' });
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      await DB.siteFeedback.add({
        id: Math.random().toString(36).substr(2, 9),
        name: feedbackName,
        rating: feedbackRating,
        userId: auth.user?.id,
        message: feedbackMessage,
        timestamp: Date.now()
      });
      
      // Refresh real feedback
      const updated = await DB.siteFeedback.getAll();
      setRealFeedback(updated);
      
      setFeedbackStatus({ type: 'success', msg: 'Thank you! Your feedback has been sent to our team.' });
      setFeedbackName('');
      setFeedbackMessage('');
      setFeedbackRating(0);
      setTimeout(() => setFeedbackStatus(null), 5000);
    } catch (err) {
      setFeedbackStatus({ type: 'error', msg: 'Failed to send feedback. Please try again.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (error) {
    return (
      <div className="p-12 h-screen bg-zinc-950 flex flex-col items-center justify-center text-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-6" />
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">
          {error.includes('API_KEY_INVALID') ? 'Invalid TMDB API Key' : error.includes('API_KEY_MISSING') ? 'TMDB API Key Missing' : 'Connection Error'}
        </h2>
        <p className="text-white/40 max-w-md mb-8 leading-relaxed">
          {error.includes('API_KEY') ? (
            <>
              Your TMDB API key is invalid or expired.
              <br /><br />
              <strong>Get a new API key:</strong>
              <br />
              1. Visit{' '}
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">
                themoviedb.org/settings/api
              </a>
              <br />
              2. Create an account (if needed)
              <br />
              3. Go to Settings → API → Request an API Key
              <br />
              4. Copy your API key (v3 auth)
              <br /><br />
              <strong>Then update .env.local:</strong>
              <br />
              <code className="bg-zinc-800 px-2 py-1 rounded text-xs">
                VITE_TMDB_API_KEY=your_new_api_key_here
              </code>
              <br /><br />
              Or login as admin and set it in Settings.
            </>
          ) : error.includes('NETWORK') ? (
            'Check your internet connection and try again.'
          ) : (
            error
          )}
        </p>
        <button onClick={() => loadData()} className="px-8 py-4 rounded-full font-black bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95">
          <RefreshCw size={20} className="inline mr-2" /> Try Again
        </button>
      </div>
    );
  }

  // Combined content for filtering/search
  let filteredContent: Movie[] = [];
  
  // If search is active and we have TMDB search results, use those
  if (searchVal && searchResults.length > 0) {
    filteredContent = searchResults;
  } else {
    // Otherwise use local content (allMovies or quickFilteredMovies)
    const uniqueContent = allMovies.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
    filteredContent = uniqueContent;
    
    // Use the bulk downloaded dynamically loaded movies if filters are active
    if (selectedGenre || selectedLanguage) {
      filteredContent = quickFilteredMovies;
    }
    
    // Local text filtering
    if (searchVal) {
      filteredContent = filteredContent.filter(item => 
        (item.title || (item as any).name || '').toLowerCase().includes(searchVal.toLowerCase())
      );
    }
  }

  return (
    <div className="font-sans selection:bg-red-600 min-h-screen bg-zinc-950" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
      {/* Navigation */}
      <nav className={`fixed w-full z-[100] px-6 py-4 flex items-center justify-between transition-all duration-500 ${scrolled ? 'backdrop-blur-md border-b' : ''}`} style={{ 
        backgroundColor: scrolled ? 'color-mix(in srgb, var(--theme-background) 95%, transparent)' : 'transparent',
        borderBottomColor: scrolled ? 'color-mix(in srgb, var(--theme-text) 10%, transparent)' : 'transparent',
        backgroundImage: scrolled ? 'none' : 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-background) 90%, transparent), transparent)'
      }}>
        <div className="flex items-center space-x-10">
          <h1 className="text-red-600 text-2xl md:text-3xl font-black tracking-tighter cursor-pointer uppercase" onClick={() => navigate('/')}>
            ChalaChitra
          </h1>
          <div className="hidden lg:flex space-x-6 text-sm font-bold uppercase tracking-widest text-gray-300">
            <button onClick={() => navigate('/')} className="hover:text-white transition">Home</button>
            <button onClick={() => navigate('/anime-world')} className="hover:text-white transition">Anime</button>
            <button onClick={() => navigate('/series')} className="hover:text-white transition">Series</button>
            <button onClick={() => navigate('/short-films')} className="hover:text-white transition">Movies</button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block flex-1 max-w-xl">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search movies, series, actors..."
              className="w-full bg-white/10 border border-white/10 rounded-full py-2 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-white"
            />
          </form>
          <button onClick={() => performSearch(searchVal)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-sm font-bold transition-all">
            Search
          </button>
          {!auth.isAuthenticated ? (
            <button onClick={() => navigate('/login')} className="bg-transparent text-white border border-zinc-700 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-800 transition">
              Login
            </button>
          ) : (
            <button onClick={() => navigate('/settings')} className="bg-transparent text-white border border-white/10 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/5 transition">
              Profile
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
            title={theme === Theme.DARK ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === Theme.DARK ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-indigo-400" />}
          </button>
          <button
            onClick={handleResetAppData}
            className="bg-white/5 text-white border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition"
            title="Clear local cache and reload"
          >
            Reset Data
          </button>
          <button className="lg:hidden text-white" onClick={() => setMobileMenu(!mobileMenu)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center space-y-8 text-2xl font-bold backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 98%, transparent)' }}>
          <button onClick={() => setMobileMenu(false)} className="absolute top-6 right-6 text-4xl">&times;</button>
          <button onClick={() => { navigate('/'); setMobileMenu(false); }}>Home</button>
          <button onClick={() => { navigate('/anime-world'); setMobileMenu(false); }}>Anime</button>
          <button onClick={() => { navigate('/series'); setMobileMenu(false); }}>Series</button>
          <button onClick={() => { navigate('/short-films'); setMobileMenu(false); }}>Movies</button>
        </div>
      )}

      {loading ? (
        <div className="h-screen flex items-center justify-center bg-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
            <p className="text-zinc-500 font-medium">Loading ChalaChitra...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Player Section */}
          <header className="relative h-[60vh] md:h-[85vh] w-full bg-black overflow-hidden group">
            {/* YouTube Trailer Player - Full Background */}
            {trailerKey && activeItem ? (
              <>
                {/* Always start muted (required for autoplay). Mute/unmute
                    is controlled via postMessage so the iframe never remounts. */}
                <YouTubePlayer
                  ref={heroPlayerRef}
                  key={`hero-${activeItem.id}-${trailerKey}`}
                  videoId={trailerKey}
                  autoplay
                  muted
                  loop={false}
                  controls={false}
                  className="absolute inset-0 z-0 h-full w-full scale-125"
                  title="Movie Trailer"
                  posterUrl={activeItem.backdrop_path ? `https://image.tmdb.org/t/p/w1280${activeItem.backdrop_path}` : undefined}
                  onEnd={handleTrailerEnd}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}></div>

                {/* Mute/Unmute — uses postMessage, zero iframe reload */}
                <button
                  onClick={() => {
                    if (isTrailerMuted) {
                      heroPlayerRef.current?.unmute();
                      setIsTrailerMuted(false);
                    } else {
                      heroPlayerRef.current?.mute();
                      setIsTrailerMuted(true);
                    }
                  }}
                  className="absolute bottom-32 right-12 z-40 p-4 bg-zinc-900/80 border border-white/20 backdrop-blur-xl rounded-full text-white hover:bg-zinc-800 hover:scale-110 shadow-2xl transition-all group"
                  title={isTrailerMuted ? 'Unmute' : 'Mute'}
                >
                  {isTrailerMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {isTrailerMuted ? 'Unmute Trailer' : 'Mute Trailer'}
                  </span>
                </button>
              </>
            ) : activeItem ? (
              /* Backdrop Image when no trailer */
              <>
                <div className="absolute inset-0 bg-black/40 z-[1]"></div>
                <img
                  src={`https://image.tmdb.org/t/p/original${activeItem.backdrop_path}`}
                  alt={activeItem.title || (activeItem as any).name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.3,
                    zIndex: 0
                  }}
                />
              </>
            ) : null}

            {/* Hero Overlay Content */}
            {activeItem && (
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '24px',
                zIndex: 20,
                maxWidth: '896px',
                transition: 'opacity 0.5s'
              }} className={trailerKey ? 'opacity-40 hover:opacity-100' : 'opacity-100'}>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">ChalaChitra Original</span>
                  <span className="text-zinc-400 text-xs font-bold uppercase">{activeItem.original_language} • {activeItem.release_date?.slice(0, 4) || (activeItem as any).first_air_date?.slice(0, 4)}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight text-white drop-shadow-lg">
                  {activeItem.title || (activeItem as any).name}
                </h2>
                <p className="text-zinc-300 text-sm md:text-lg mb-8 line-clamp-3 drop-shadow-md max-w-xl">
                  {activeItem.overview}
                </p>

                <div className="flex items-center gap-4">
                  <button onClick={() => { setSelectedMovie(activeItem, true); }} className="px-8 py-3 rounded-md font-bold flex items-center justify-center hover:opacity-80 transition min-w-[140px]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                    <Play size={18} className="mr-2" style={{ fill: '#000000', color: '#000000' }} /> Play Now
                  </button>
                  <button onClick={() => { setSelectedMovie(activeItem, false); }} className="bg-zinc-600/50 backdrop-blur text-white px-8 py-3 rounded-md font-bold flex items-center justify-center hover:bg-zinc-600 transition min-w-[140px]">
                    <Info size={18} className="mr-2" /> More Info
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* Hero Slider Feature (TMDB Trending) */}
          {hpHeroSliderEnabled && trending.length > 0 && (
            <div className="relative z-30 px-6 md:px-12 -mt-16 sm:-mt-24 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Featured & Trending
                </h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{trending.length} Movies</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {trending.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => changeVideo(item)}
                    className={`relative w-64 aspect-video flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 snap-start border-2 group ${activeItem?.id === item.id ? 'border-[var(--theme-primary)] scale-105 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'border-transparent opacity-70 hover:opacity-100 hover:border-zinc-600'}`}
                    style={{ borderColor: activeItem?.id === item.id ? 'var(--theme-primary)' : '' }}
                  >
                    {activeItem?.id === item.id && trailerKey ? (
                      <YouTubePlayer
                        key={`slider-${item.id}-${trailerKey}`}
                        videoId={trailerKey}
                        autoplay
                        muted
                        controls={false}
                        className="absolute inset-0 h-full w-full scale-125 pointer-events-none"
                        title={`${item.title || (item as any).name} trailer preview`}
                      />
                    ) : (
                      <img src={`https://image.tmdb.org/t/p/w500${item.backdrop_path}`} alt={item.title || (item as any).name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{item.original_language.toUpperCase()}</span>
                          <span className="text-[8px] text-zinc-500">•</span>
                          <span className="text-[8px] font-black text-yellow-500 flex items-center gap-1">
                            <Star size={8} className="fill-yellow-500" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white line-clamp-2">{item.title || (item as any).name}</p>
                        {activeItem?.id === item.id && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--theme-primary)' }}>
                            <Play size={10} fill="currentColor" />
                            Now Playing
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Playing indicator */}
                    {activeItem?.id === item.id && (
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                        <div className="flex gap-1">
                          <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                          <div className="w-1 h-3 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></div>
                          <div className="w-1 h-3 bg-white rounded-full animate-pulse [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Grid */}
          <main className="px-6 md:px-12 py-12 relative z-30">
            <div className="mb-10 lg:flex items-center justify-between gap-6">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--theme-text)' }}>
                  {searchVal && filteredContent.length > 0 && !selectedLanguage && !selectedGenre
                    ? `Search Results for "${searchVal}"`
                    : searchVal && (selectedLanguage || selectedGenre)
                    ? `${LANGUAGES.find((l: typeof LANGUAGES[0]) => l.code === selectedLanguage)?.label || 'All'} ${selectedGenre ? GENRES[selectedGenre] : 'Movies'} Related to "${searchVal}"`
                    : selectedLanguage || selectedGenre
                    ? `${LANGUAGES.find((l: typeof LANGUAGES[0]) => l.code === selectedLanguage)?.label || ''} ${selectedGenre ? GENRES[selectedGenre] : 'Movies'}`.trim()
                    : searchVal
                    ? `Searching for "${searchVal}"`
                    : 'Trending on ChalaChitra'}
                </h2>
                <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {searchVal && (
                  <button
                    onClick={() => { setSearchVal(''); setSearchResults([]); setShowSearchResults(false); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600/20 text-red-500 hover:bg-red-600/30 transition-all"
                  >
                    Clear Search
                  </button>
                )}
                
                {hpFiltersEnabled && (
                  <div className="flex bg-zinc-900/80 backdrop-blur rounded-2xl p-1 border border-zinc-800">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Filter size={14} className={showFilters ? 'text-red-500' : ''} />
                      {showFilters ? 'Hide Filters' : 'Quick Filters'}
                    </button>
                  </div>
                )}

                {showFilters && (
                  <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-zinc-900/80 border border-zinc-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none min-w-[140px]"
                    >
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>

                    <select
                      value={selectedGenre || ''}
                      onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : null)}
                      className="bg-zinc-900/80 border border-zinc-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none min-w-[140px]"
                    >
                      <option value="">All Genres</option>
                      {Object.entries(GENRES).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>

                    {(selectedGenre || selectedLanguage) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate('/short-films')}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 px-2 flex items-center"
                        >
                          View All <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => { setSelectedGenre(null); setSelectedLanguage(''); }}
                          className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 px-2"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Loading State - Show FIRST when loading */}
            {isQuickFilterLoading && (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mb-6"></div>
                <p className="text-zinc-500 font-medium">Loading {selectedLanguage ? LANGUAGES.find((l: typeof LANGUAGES[0]) => l.code === selectedLanguage)?.label : ''} {selectedGenre ? GENRES[selectedGenre] : 'Movies'}...</p>
              </div>
            )}

            {/* Content Grid - Only show when NOT loading and has content */}
            {!isQuickFilterLoading && filteredContent.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                {filteredContent.map(item => (
                  <div key={item.id} onClick={() => { setSelectedMovie(item, false); }} className="group cursor-pointer">
                    <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 ring-0 group-hover:ring-4 ring-zinc-500 transition-all duration-300 shadow-xl">
                      <img
                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={item.title || (item as any).name}
                        className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-40 transition-all duration-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="bg-red-600 p-4 rounded-full scale-50 group-hover:scale-100 transition-transform">
                          <Play fill="white" size={24} className="text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-bold text-sm line-clamp-1 text-zinc-100">{item.title || (item as any).name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] text-red-500 font-bold uppercase">{item.original_language}</span>
                        <span className="text-[10px] text-zinc-500">•</span>
                        <span className="text-[10px] text-zinc-500">{item.release_date?.slice(0, 4) || (item as any).first_air_date?.slice(0, 4)}</span>
                        <span className="text-[10px] text-zinc-500">•</span>
                        <span className="text-[10px] text-zinc-500 flex items-center"><Star size={10} className="mr-1 text-yellow-500 inline" />{(item.vote_average || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State - Show when NOT loading and NO content */}
            {!isQuickFilterLoading && filteredContent.length === 0 && (
              <div className="text-center py-32 text-zinc-600">
                <p className="text-xl italic mb-4">We couldn't find any match in ChalaChitra library.</p>
                {(selectedLanguage || selectedGenre) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-zinc-500">
                      {selectedLanguage && `Language filter: ${LANGUAGES.find((l: typeof LANGUAGES[0]) => l.code === selectedLanguage)?.label} is active`}
                      {selectedLanguage && selectedGenre && ' | '}
                      {selectedGenre && `Genre: ${GENRES[selectedGenre]}`}
                    </p>
                    <button
                      onClick={() => { setSelectedLanguage(''); setSelectedGenre(null); setQuickFilteredMovies([]); }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Clear Filters & Search All
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Anime Section */}
            {anime.length > 0 && (
              <div className="mt-20">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                    <h2 className="text-2xl font-black tracking-tighter uppercase">
                      Anime World
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate('/anime-world')}
                    className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 flex items-center gap-2"
                  >
                    View All <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                  {anime.map(item => (
                    <div key={item.id} onClick={() => { setSelectedMovie(item, false); }} className="group cursor-pointer">
                      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 ring-0 group-hover:ring-4 ring-indigo-500 transition-all duration-300 shadow-xl">
                        <img
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                          alt={item.title || (item as any).name}
                          className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-40 transition-all duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="bg-indigo-600 p-4 rounded-full scale-50 group-hover:scale-100 transition-transform">
                            <Play fill="white" size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="font-bold text-sm line-clamp-1 text-zinc-100">{item.title || (item as any).name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] text-indigo-500 font-bold uppercase">Anime</span>
                          <span className="text-[10px] text-zinc-500">•</span>
                          <span className="text-[10px] text-zinc-500">{item.release_date?.slice(0, 4) || (item as any).first_air_date?.slice(0, 4)}</span>
                          <span className="text-[10px] text-zinc-500">•</span>
                          <span className="text-[10px] text-zinc-500 flex items-center"><Star size={10} className="mr-1 text-yellow-500 inline" />{(item.vote_average || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browse by Language Section */}
            <div className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-green-600 rounded-full" />
                  <h2 className="text-2xl font-black tracking-tighter uppercase">
                    Browse by Language
                  </h2>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {LANGUAGE_CARDS.length} languages with movies
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {LANGUAGE_CARDS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => navigate(`/language/${lang.code}`)}
                    className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${lang.gradient} transition-all hover:scale-105 active:scale-95 shadow-xl`}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl md:text-5xl mb-2">{lang.flag}</span>
                      <span className="text-white font-black text-[10px] md:text-xs uppercase tracking-widest text-center px-1">{lang.name}</span>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/40 to-transparent" />
                  </button>
                ))}
              </div>
            </div>

            {/* User Feedback Carousel */}
            {hpFeedbackEnabled && (
              <div className="mt-32 relative overflow-hidden rounded-[3rem] bg-zinc-900/40 border border-zinc-800 p-8 md:p-16 animate-in fade-in duration-1000">
                <div className="absolute top-0 right-0 p-8 text-zinc-800 pointer-events-none">
                  <MessageSquareText size={120} strokeWidth={1} />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Community Voices</h4>
                  </div>

                  <div className="min-h-[200px] flex flex-col items-center justify-center">
                    <div className="flex gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} className={i < allFeedback[feedbackIndex].rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"} />
                      ))}
                    </div>

                    <p className="text-2xl md:text-3xl font-black italic tracking-tight text-white mb-8 leading-tight animate-in fade-in slide-in-from-bottom-2 duration-700">
                      "{allFeedback[feedbackIndex].comment}"
                    </p>

                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-black text-white text-lg shadow-xl shadow-red-900/20">
                        {allFeedback[feedbackIndex].avatar}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-white uppercase text-sm">{allFeedback[feedbackIndex].user}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Watching {allFeedback[feedbackIndex].movie}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 mt-12">
                    <button
                      onClick={() => setFeedbackIndex(prev => (prev - 1 + allFeedback.length) % allFeedback.length)}
                      className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex gap-2">
                      {allFeedback.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === feedbackIndex ? 'w-8 bg-red-600' : 'w-1.5 bg-zinc-800'}`}></div>
                      ))}
                    </div>
                    <button
                      onClick={() => setFeedbackIndex(prev => (prev + 1) % allFeedback.length)}
                      className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Site Feedback Form Section */}
            <div className="mt-32 max-w-4xl mx-auto px-6">
              <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Star size={120} fill="currentColor" />
                </div>
                
                <div className="relative z-10 text-left">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                    <h2 className="text-2xl font-black tracking-tighter uppercase" style={{ color: 'var(--theme-text)' }}>Send us your thoughts</h2>
                  </div>
                  
                  <p className="text-sm mb-8 max-w-2xl opacity-70" style={{ color: 'var(--theme-text)' }}>
                    We're constantly improving ChalaChitra. Tell us what you think, suggest features, or just say hi!
                  </p>

                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <UserCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--theme-text)' }} />
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          required
                          className="w-full rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:ring-2 transition-all bg-white/5 border border-white/10"
                          style={{ color: 'var(--theme-text)' }}
                        />
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                         <span className="text-[10px] uppercase font-black text-white/40 tracking-widest mr-2">Rate Us</span>
                         {[1, 2, 3, 4, 5].map((star) => (
                           <button
                             key={star}
                             type="button"
                             onClick={() => setFeedbackRating(star)}
                             onMouseEnter={() => setFeedbackHoverRating(star)}
                             onMouseLeave={() => setFeedbackHoverRating(0)}
                             className="p-1 transition-all hover:scale-110 active:scale-95"
                           >
                             <Star 
                               size={24} 
                               className={`transition-colors ${(feedbackHoverRating || feedbackRating) >= star ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-zinc-600'}`} 
                             />
                           </button>
                         ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-6 opacity-40" style={{ color: 'var(--theme-text)' }} />
                      <textarea
                        placeholder="Your Feedback..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        required
                        rows={4}
                        className="w-full rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white/5 border border-white/10"
                        style={{ color: 'var(--theme-text)' }}
                      />
                    </div>
                    
                    {feedbackStatus && (
                      <div className={`p-4 rounded-xl text-xs font-bold ${feedbackStatus.type === 'success' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                        {feedbackStatus.msg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingFeedback}
                      className="text-white font-black uppercase tracking-widest text-xs px-10 py-4 rounded-2xl transition-all shadow-lg shadow-black/20 disabled:opacity-50 flex items-center gap-2 group"
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                    >
                      {isSubmittingFeedback ? 'Sending...' : (
                        <>
                          Submit Feedback
                          <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </main>

          {/* Footer Updated */}
          <footer className="border-t mt-20 py-12 text-center text-sm border-white/10 text-zinc-500">
            <p className="font-bold mb-2 text-zinc-400">CHALACHITRA</p>
            <p>&copy; 2026 CHALACHITRA • Your Direct Link to Premium Content</p>
          </footer>

          {/* Floating Chatbot Button */}
          {chatbotEnabled && !showChatbot && (
            <button
              onClick={() => setShowChatbot(true)}
              className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            >
              <MessageCircle size={28} className="text-white" />
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-950 animate-pulse"></span>
              <span className="absolute right-full mr-4 bg-white text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                Chat with AI
              </span>
            </button>
          )}

          {/* Chatbot Modal */}
          {showChatbot && (
            <>
              <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={() => setShowChatbot(false)}
              />
              <div
                className="fixed bottom-0 right-0 z-[70] w-full md:w-[480px] md:bottom-8 md:right-8 md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
              >
                <EnhancedChatbot 
                  onClose={() => {
                    setShowChatbot(false);
                  }} 
                  compact 
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
