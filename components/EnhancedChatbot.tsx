import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { classifyQuery } from '../services/gemini';
import { SimpleDB } from '../services/simpleDb';
import { ChatMessage, Movie, Theme } from '../types';
import { Send, Bot, Star, TrendingUp, X, Globe, Film, RefreshCcw, Trash2, Loader2, ChevronLeft, Users, Award, Sparkles } from 'lucide-react';

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface MovieDetails {
  overview: string;
  cast: CastMember[];
  director: string;
  release_date: string;
  runtime: number;
  vote_average: number;
}

interface ActorInfo {
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  movies: Movie[];
}

const EnhancedChatbot: React.FC<{ onClose?: () => void; compact?: boolean }> = ({ onClose, compact = false }) => {
  const { auth, theme, systemKey, setSelectedMovie } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [intentLabel, setIntentLabel] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showPopularActors, setShowPopularActors] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [showRating, setShowRating] = useState<string | null>(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState<MovieDetails | null>(null);
  const [selectedActor, setSelectedActor] = useState<ActorInfo | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDark = theme === Theme.DARK;

  const quickActions = [
    { id: 'trending', label: '🔥 Trending', color: 'from-orange-500 to-red-500' },
    { id: 'toprated', label: '⭐ Top Rated', color: 'from-yellow-500 to-amber-500' },
    { id: 'actor', label: '🎭 Actors', color: 'from-pink-500 to-rose-500' },
    { id: 'language', label: '🌍 Languages', color: 'from-blue-500 to-cyan-500' },
    { id: 'genre', label: '🎬 Genres', color: 'from-purple-500 to-pink-500' },
  ];

  const languages = [
    { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
    { code: 'kn', name: 'Kannada', emoji: '🇮🇳' },
    { code: 'te', name: 'Telugu', emoji: '🇮🇳' },
    { code: 'ta', name: 'Tamil', emoji: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', emoji: '🇮🇳' },
    { code: 'en', name: 'English', emoji: '🇺🇸' },
    { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
    { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  ];

  const popularActors = [
    { id: 287, name: 'Brad Pitt', emoji: '🇺🇸' },
    { id: 6384, name: 'Leonardo DiCaprio', emoji: '🇺🇸' },
    { id: 3223, name: 'Tom Hanks', emoji: '🇺🇸' },
    { id: 1136406, name: 'Timothée Chalamet', emoji: '🇺🇸' },
    { id: 1245, name: 'Scarlett Johansson', emoji: '🇺🇸' },
    { id: 5064, name: 'Emma Stone', emoji: '🇺🇸' },
    { id: 1267329, name: 'Anya Taylor-Joy', emoji: '🇺🇸' },
    { id: 35742, name: 'Shah Rukh Khan', emoji: '🇮🇳' },
  ];

  const getTmdbKey = () => {
    const envKey = ((import.meta as any).env?.VITE_TMDB_API_KEY || '').trim();
    const currentKey = (systemKey || '').trim();
    return currentKey || envKey;
  };

  const genres = [
    { id: 28, name: 'Action', emoji: '💥' },
    { id: 35, name: 'Comedy', emoji: '😂' },
    { id: 18, name: 'Drama', emoji: '🎭' },
    { id: 27, name: 'Horror', emoji: '😱' },
    { id: 10749, name: 'Romance', emoji: '💕' },
    { id: 878, name: 'Sci-Fi', emoji: '🚀' },
    { id: 53, name: 'Thriller', emoji: '😰' },
    { id: 12, name: 'Adventure', emoji: '🗺️' },
  ];

  const ratingEmojis = [
    { rating: 1, emoji: '😞', label: 'Poor' },
    { rating: 2, emoji: '😕', label: 'Fair' },
    { rating: 3, emoji: '😐', label: 'Good' },
    { rating: 4, emoji: '😊', label: 'Great' },
    { rating: 5, emoji: '🎉', label: 'Excellent' },
  ];

  useEffect(() => {
    if (messages.length === 0 && systemKey) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '🎬 Hello! I\'m your ChalaChitra AI. Ask me about movies or click the buttons below!',
        timestamp: Date.now()
      }]);
    }
  }, [systemKey]);

  useEffect(() => {
    SimpleDB.settings.get('chatbot_feedback_enabled').then((val: string | null) => {
      setFeedbackEnabled(val !== 'false');
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedMovieDetails, selectedActor]);

  const fetchMovies = async (query: string) => {
    const tmdbKey = getTmdbKey();
    console.log('[Chatbot] fetchMovies called. TMDB key available:', !!tmdbKey, 'query:', query);
    if (!tmdbKey) {
      console.warn('[Chatbot] No TMDB API key configured!');
      return [];
    }
    
    try {
      let results: any[] = [];
      if (query === 'trending') {
        const data = await TMDB.getTrending(tmdbKey);
        results = data.results || [];
      } else if (query === 'toprated') {
        const data = await TMDB.discoverMovies(tmdbKey, { sort_by: 'vote_average.desc', vote_count_gte: '200' });
        results = data.results || [];
      } else if (query.startsWith('lang:')) {
        const langCode = query.split(':')[1];
        const data = await TMDB.getLanguageMovies(tmdbKey, langCode);
        results = data.results || [];
      } else if (query.startsWith('genre:')) {
        const genreId = parseInt(query.split(':')[1]);
        const data = await TMDB.getGenreMovies(tmdbKey, [genreId]);
        results = data.results || [];
      } else {
        const cleanQuery = query.replace(/\s+(movie|film|show|series|results|check|find)\s*$/i, '').trim();
        const data = await TMDB.search(tmdbKey, cleanQuery);
        results = data.results || [];
      }
      console.log('[Chatbot] TMDB returned', results.length, 'results');
      // Normalize and return all results
      const normalized = results.slice(0, 6).map((r: any) => ({
        id: r.id,
        title: r.title || r.name || r.original_title || r.original_name || 'Unknown Movie',
        original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
        overview: r.overview || '',
        poster_path: r.poster_path || null,
        backdrop_path: r.backdrop_path || r.poster_path || null,
        release_date: r.release_date || r.first_air_date || '',
        vote_average: r.vote_average || 0,
        genre_ids: r.genre_ids || [],
        popularity: r.popularity || 0,
        original_language: r.original_language || 'en'
      }));
      console.log('[Chatbot] Normalized', normalized.length, 'movies');
      return normalized;
    } catch (error) {
      console.error('[Chatbot] Failed to fetch movies:', error);
      return [];
    }
  };

  const fetchMovieDetails = async (movieId: number): Promise<MovieDetails | null> => {
    const tmdbKey = getTmdbKey();
    if (!tmdbKey) return null;
    
    try {
      const [details, credits] = await Promise.all([
        TMDB.getMovieDetails(tmdbKey, movieId),
        TMDB.getMovieCredits(tmdbKey, movieId)
      ]);
      
      const crew = credits.crew || [];
      const director = crew.find((c: any) => c.job === 'Director')?.name || 'Unknown';
      
      return {
        overview: details.overview || 'No overview available',
        cast: (credits.cast || []).slice(0, 6),
        director,
        release_date: details.release_date || 'N/A',
        runtime: details.runtime || 0,
        vote_average: details.vote_average || 0
      };
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
      return null;
    }
  };

  const fetchActorDetails = async (actorId: number): Promise<ActorInfo | null> => {
    const tmdbKey = getTmdbKey();
    if (!tmdbKey) return null;

    try {
      const [personData, creditsData] = await Promise.all([
        TMDB.getPersonDetails(tmdbKey, actorId),
        TMDB.getPersonMovieCredits(tmdbKey, actorId)
      ]);

      // Extract movies from cast and crew, combine and deduplicate
      const castMovies: Movie[] = (creditsData.cast || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        original_title: c.original_title,
        overview: c.overview || '',
        poster_path: c.poster_path,
        backdrop_path: c.backdrop_path,
        release_date: c.release_date,
        vote_average: c.vote_average || 0,
        genre_ids: c.genre_ids || [],
        popularity: c.popularity || 0,
        original_language: c.original_language
      }));

      const crewMovies: Movie[] = (creditsData.crew || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        original_title: c.original_title,
        overview: c.overview || '',
        poster_path: c.poster_path,
        backdrop_path: c.backdrop_path,
        release_date: c.release_date,
        vote_average: c.vote_average || 0,
        genre_ids: c.genre_ids || [],
        popularity: c.popularity || 0,
        original_language: c.original_language
      }));

      // Combine and sort by popularity, take top 12
      const allMovies = [...castMovies, ...crewMovies]
        .sort((a: Movie, b: Movie) => b.popularity - a.popularity)
        .slice(0, 12);

      return {
        name: personData.name,
        biography: personData.biography || 'No biography available',
        birthday: personData.birthday,
        place_of_birth: personData.place_of_birth,
        profile_path: personData.profile_path,
        known_for_department: personData.known_for_department,
        popularity: personData.popularity,
        movies: allMovies
      };
    } catch (error) {
      console.error('Failed to fetch actor details:', error);
      return null;
    }
  };

  const searchActor = async (query: string): Promise<{ id: number; name: string; profile_path: string | null } | null> => {
    const tmdbKey = getTmdbKey();
    if (!tmdbKey) return null;

    try {
      const personData = await TMDB.searchPerson(tmdbKey, query);

      if (personData.results && personData.results.length > 0) {
        const queryLower = query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/);
        
        // Score each result to find the best match
        const scoredResults = personData.results.map((p: any) => {
          const nameLower = p.name.toLowerCase().trim();
          const nameWords = nameLower.split(/\s+/);
          let score = 0;
          
          // Exact match gets highest score
          if (nameLower === queryLower) score = 1000;
          
          // Check if all query words are in the name
          const allWordsMatch = queryWords.every((qw: string) => nameWords.some((nw: string) => nw.includes(qw) || qw.includes(nw)));
          if (allWordsMatch) score += 500;
          
          // Check if first name matches
          if (queryWords[0] && nameWords[0] && (nameWords[0].includes(queryWords[0]) || queryWords[0].includes(nameWords[0]))) {
            score += 200;
          }
          
          // Check if last name matches
          if (queryWords.length > 1 && nameWords.length > 1) {
            const queryLast = queryWords[queryWords.length - 1];
            const nameLast = nameWords[nameWords.length - 1];
            if (nameLast.includes(queryLast) || queryLast.includes(nameLast)) {
              score += 150;
            }
          }
          
          // Bonus for known_for_department being acting
          if (p.known_for_department === 'Acting') score += 50;
          
          // Bonus for having a profile picture
          if (p.profile_path) score += 20;
          
          return { ...p, score };
        });
        
        // Sort by score descending
        scoredResults.sort((a: any, b: any) => b.score - a.score);
        
        // Return the best match if it has a decent score
        const bestMatch = scoredResults[0];
        if (bestMatch.score > 50) {
          return {
            id: bestMatch.id,
            name: bestMatch.name,
            profile_path: bestMatch.profile_path
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to search actor:', error);
      return null;
    }
  };

  const handleSend = async (queryOverride?: string) => {
    // Determine the query
    const textToSend = typeof queryOverride === 'string' ? queryOverride : input;
    if (!textToSend.trim() || loading) return;

    let displayContent = textToSend;
    if (textToSend === 'trending') displayContent = '🔥 Trending Movies';
    else if (textToSend === 'toprated') displayContent = '⭐ Top Rated Movies';
    else if (textToSend.startsWith('lang:')) {
      const code = textToSend.split(':')[1];
      const name = languages.find(l => l.code === code)?.name || code;
      displayContent = `🌍 Popular ${name} Movies`;
    }
    else if (textToSend.startsWith('genre:')) {
       const code = textToSend.split(':')[1];
       const name = genres.find(g => g.id.toString() === code)?.name || code;
       displayContent = `🎭 ${name} Movies`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickActions(false);
    setShowLanguages(false);
    setShowGenres(false);
    setSelectedMovieDetails(null);
    setSelectedActor(null);

    try {
      const isKeyword = ['trending', 'toprated'].includes(textToSend) || textToSend.startsWith('lang:') || textToSend.startsWith('genre:');

      if (isKeyword) {
        // Keyword-based (trending, language, genre) — fetch movies directly
        const movies = await fetchMovies(textToSend);
        let responseText = '';
        if (textToSend === 'trending') responseText = '🔥 Here are the trending movies:';
        else if (textToSend === 'toprated') responseText = '⭐ Here are the top rated movies:';
        else if (textToSend.startsWith('lang:')) {
          const langName = languages.find(l => l.code === textToSend.split(':')[1])?.name || 'Movies';
          responseText = `🌍 Popular ${langName} movies:`;
        } else if (textToSend.startsWith('genre:')) {
          const genreName = genres.find(g => g.id.toString() === textToSend.split(':')[1])?.name || 'Movies';
          responseText = `🎭 Great ${genreName} movies:`;
        }
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
          movies: movies.length > 0 ? movies : undefined
        };
        setMessages(prev => [...prev, botMessage]);
        if (movies.length > 0 && feedbackEnabled) {
          setTimeout(() => setShowRating(botMessage.id), 1000);
        }
      } else {
        // Free-text query — use classifyQuery to intelligently detect intent
        const tmdbKey = getTmdbKey();
        let handled = false;

        // Show classifying status
        setClassifying(true);
        const intent = await classifyQuery(textToSend);
        setClassifying(false);
        setIntentLabel(`Detected: ${intent.type} (${Math.round(intent.confidence*100)}% confidence)`);
        setTimeout(() => setIntentLabel(null), 3000);

        if (tmdbKey) {
          // Route by intent type
          setFetching(true);
          try {
            if (intent.type === 'actor') {
              // Search for person directly
              const multiResults = await TMDB.searchWithMulti(tmdbKey, intent.entity);
              const personResult = (multiResults.results || []).find((r: any) => r.media_type === 'person');
              if (personResult) {
                const actorDetails = await fetchActorDetails(personResult.id);
                if (actorDetails) {
                  setSelectedActor(actorDetails);
                  setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `🎭 **${actorDetails.name}**\n\n📖 **Biography:**\n${actorDetails.biography.substring(0, 300)}...\n\n🎂 **Born:** ${actorDetails.birthday || 'N/A'}\n📍 **Place:** ${actorDetails.place_of_birth || 'N/A'}\n🎬 **Dept:** ${actorDetails.known_for_department}\n\n🎥 **Popular Movies** (tap to view):`,
                    timestamp: Date.now(),
                    actor: actorDetails,
                    movies: actorDetails.movies
                  }]);
                  handled = true;
                }
              }

            } else if (intent.type === 'movie') {
              // Movie search - automatically expand details for top result
              let searchEntity = intent.entity;
              let multiResults = await TMDB.searchWithMulti(tmdbKey, searchEntity);
              let results = (multiResults.results || [])
                .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

              // If no results, try stripping common "movie" keywords
              if (results.length === 0) {
                const cleaned = searchEntity.replace(/\s+(movie|film|show|series|results|check|find)\s*$/i, '').trim();
                if (cleaned !== searchEntity) {
                  searchEntity = cleaned;
                  multiResults = await TMDB.searchWithMulti(tmdbKey, searchEntity);
                  results = (multiResults.results || [])
                    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
                }
              }
              
              if (results.length > 0) {
                const topMovie = results[0];
                const movies = results.slice(0, 4).map((r: any) => ({
                  id: r.id, title: r.title || r.name || 'Unknown',
                  original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
                  overview: r.overview || '', poster_path: r.poster_path || null,
                  backdrop_path: r.backdrop_path || r.poster_path || null,
                  release_date: r.release_date || r.first_air_date || '',
                  vote_average: r.vote_average || 0, genre_ids: r.genre_ids || [],
                  popularity: r.popularity || 0, original_language: r.original_language || 'en'
                }));

                // Fetch details to provide a rich summary immediately
                const details = await fetchMovieDetails(topMovie.id);
                if (details) {
                  const langNameMap: Record<string, string> = { 'hi': 'Hindi', 'kn': 'Kannada', 'te': 'Telugu', 'ta': 'Tamil', 'ml': 'Malayalam', 'en': 'English' };
                  const lang = langNameMap[topMovie.original_language] || topMovie.original_language || 'English';
                  
                  const botMsg: ChatMessage = { 
                    id: (Date.now()+1).toString(), 
                    role: 'assistant', 
                    content: `📽️ **${topMovie.title || topMovie.name}**\n\n📖 **Synopsis:**\n${details.overview}\n\n🎭 **Director:** ${details.director}\n⭐ **Rating:** ${details.vote_average.toFixed(1)}\n📅 **Released:** ${details.release_date}\n🌍 **Language:** ${lang}\n⏱️ **Runtime:** ${details.runtime} min\n\n👥 **Main Cast:** ${details.cast.slice(0, 3).map(c => c.name).join(', ')}`,
                    timestamp: Date.now(), 
                    movies,
                    cast: details.cast
                  };
                  setMessages(prev => [...prev, botMsg]);
                  if (feedbackEnabled) {
                    setTimeout(() => setShowRating(botMsg.id), 1000);
                  }
                } else {
                  const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'assistant', content: `🎬 Found some results for **"${intent.entity}"**:`, timestamp: Date.now(), movies };
                  setMessages(prev => [...prev, botMsg]);
                  if (feedbackEnabled) {
                    setTimeout(() => setShowRating(botMsg.id), 1000);
                  }
                }
                handled = true;
              }

            } else if (intent.type === 'genre') {
              // Map entity to genre ID
              const genreIdMap: Record<string, number> = {
                'action': 28, 'comedy': 35, 'horror': 27, 'romance': 10749, 'drama': 18,
                'sci-fi': 878, 'thriller': 53, 'animation': 16, 'documentary': 99,
                'fantasy': 14, 'crime': 80, 'adventure': 12
              };
              const genreId = genreIdMap[intent.entity.toLowerCase()] || 28;
              const data = await TMDB.getGenreMovies(tmdbKey, [genreId]);
              const results = (data.results || []);
              if (results.length > 0) {
                const movies = results.slice(0, 4).map((r: any) => ({
                    id: r.id, title: r.title || r.name || 'Unknown',
                    original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
                    overview: r.overview || '', poster_path: r.poster_path || null,
                    backdrop_path: r.backdrop_path || r.poster_path || null,
                    release_date: r.release_date || r.first_air_date || '',
                    vote_average: r.vote_average || 0, genre_ids: r.genre_ids || [],
                    popularity: r.popularity || 0, original_language: r.original_language || 'en'
                }));
                const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'assistant', content: `🎭 Great **${intent.entity}** movies for you:`, timestamp: Date.now(), movies };
                setMessages(prev => [...prev, botMsg]);
                if (feedbackEnabled) {
                  setTimeout(() => setShowRating(botMsg.id), 1000);
                }
                handled = true;
              }

            } else if (intent.type === 'language') {
              // Map language names to codes if necessary
              const langCodeMap: Record<string, string> = {
                'hindi': 'hi', 'kannada': 'kn', 'telugu': 'te', 'tamil': 'ta',
                'malayalam': 'ml', 'english': 'en', 'japanese': 'ja', 'korean': 'ko',
                'hindi movies': 'hi', 'tamil movies': 'ta', 'telugu movies': 'te'
              };
              const langCode = langCodeMap[intent.entity.toLowerCase()] || intent.entity;
              const data = await TMDB.getLanguageMovies(tmdbKey, langCode);
              const results = (data.results || []);
              if (results.length > 0) {
                const movies = results.slice(0, 4).map((r: any) => ({
                    id: r.id, title: r.title || r.name || 'Unknown',
                    original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
                    overview: r.overview || '', poster_path: r.poster_path || null,
                    backdrop_path: r.backdrop_path || r.poster_path || null,
                    release_date: r.release_date || r.first_air_date || '',
                    vote_average: r.vote_average || 0, genre_ids: r.genre_ids || [],
                    popularity: r.popularity || 0, original_language: r.original_language || 'en'
                }));
                const langNameMap: Record<string, string> = {
                  'hi': 'Hindi', 'kn': 'Kannada', 'te': 'Telugu', 'ta': 'Tamil',
                  'ml': 'Malayalam', 'en': 'English', 'ja': 'Japanese', 'ko': 'Korean'
                };
                const langName = langNameMap[langCode] || langCode;
                const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'assistant', content: `🌍 Popular **${langName}** movies:`, timestamp: Date.now(), movies };
                setMessages(prev => [...prev, botMsg]);
                if (feedbackEnabled) {
                  setTimeout(() => setShowRating(botMsg.id), 1000);
                }
                handled = true;
              }

            } else if (intent.type === 'mood') {
              const moodGenreMap: Record<string, number> = {
                'sad': 18, 'happy': 35, 'romantic': 10749, 'scared': 27,
                'excited': 28, 'bored': 12, 'angry': 28, 'laugh': 35, 'cry': 18
              };
              const moodKey = Object.keys(moodGenreMap).find(k => intent.entity.toLowerCase().includes(k)) || 'happy';
              const genreId = moodGenreMap[moodKey] || 35;
              const data = await TMDB.getGenreMovies(tmdbKey, [genreId]);
              const results = (data.results || []);
              if (results.length > 0) {
                const movies = results.slice(0, 4).map((r: any) => ({
                    id: r.id, title: r.title || r.name || 'Unknown',
                    original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
                    overview: r.overview || '', poster_path: r.poster_path || null,
                    backdrop_path: r.backdrop_path || r.poster_path || null,
                    release_date: r.release_date || r.first_air_date || '',
                    vote_average: r.vote_average || 0, genre_ids: r.genre_ids || [],
                    popularity: r.popularity || 0, original_language: r.original_language || 'en'
                }));
                const moodMessages: Record<string, string> = {
                  'sad': '🥺 Feeling sad? These emotional dramas might hit right:', 'happy': '😄 Happy vibes! Here are some fun movies:',
                  'romantic': '💕 Feeling romantic? Here are some love stories:',  'scared': '😱 Ready to be scared? Here are some thrillers:',
                  'excited': '🚀 Adrenaline rush! Here are action-packed movies:', 'bored': '🧪 Bored? These adventures will keep you hooked:',
                  'laugh': '😂 Need a laugh? Here are some comedies:', 'cry': '😢 Ready to cry? These will get your tears flowing:'
                };
                const botMsg: ChatMessage = {
                  id: (Date.now()+1).toString(), role: 'assistant',
                  content: moodMessages[moodKey] || `🎬 Movies that match your mood:`,
                  timestamp: Date.now(), movies
                };
                setMessages(prev => [...prev, botMsg]);
                if (feedbackEnabled) {
                  setTimeout(() => setShowRating(botMsg.id), 1000);
                }
                handled = true;
              }

            } else {
              const cleanQuery = textToSend.replace(/\s+(movie|film|show|series|results|check|find)\s*$/i, '').trim();
              const multiResults = await TMDB.searchWithMulti(tmdbKey, cleanQuery);
              const results = (multiResults.results || []) as any[];
              const topPerson = results.find(r => r.media_type === 'person');
              const topMovie = results.find(r => r.media_type === 'movie' || r.media_type === 'tv');
              const qLower = cleanQuery.toLowerCase();
              const nameMatch = topPerson && topPerson.name && topPerson.name.toLowerCase().split(' ').some((w: string) => qLower.includes(w));
              if (nameMatch && topPerson) {
                const actorDetails = await fetchActorDetails(topPerson.id);
                if (actorDetails) {
                  setSelectedActor(actorDetails);
                  setMessages(prev => [...prev, {
                    id: (Date.now()+1).toString(), role: 'assistant',
                    content: `🎭 **${actorDetails.name}**\n\n📖 **Biography:**\n${actorDetails.biography.substring(0, 300)}...\n\n🎂 **Born:** ${actorDetails.birthday || 'N/A'}\n📍 **Place:** ${actorDetails.place_of_birth || 'N/A'}\n🎬 **Dept:** ${actorDetails.known_for_department}\n\n🎥 **Popular Movies** (tap to view):`,
                    timestamp: Date.now(), actor: actorDetails, movies: actorDetails.movies
                  }]);
                  handled = true;
                }
              } else if (topMovie || results.length > 0) {
                const movies = results
                  .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
                  .slice(0, 4)
                  .map((r: any) => ({
                    id: r.id, title: r.title || r.name || 'Unknown',
                    original_title: r.original_title || r.original_name || r.title || r.name || 'Unknown',
                    overview: r.overview || '', poster_path: r.poster_path || null,
                    backdrop_path: r.backdrop_path || r.poster_path || null,
                    release_date: r.release_date || r.first_air_date || '',
                    vote_average: r.vote_average || 0, genre_ids: r.genre_ids || [],
                    popularity: r.popularity || 0, original_language: r.original_language || 'en'
                  }));
                if (movies.length > 0) {
                  const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'assistant', content: `🎬 Top results for **"${cleanQuery}"**:`, timestamp: Date.now(), movies };
                  setMessages(prev => [...prev, botMsg]);
                  if (feedbackEnabled) {
                    setTimeout(() => setShowRating(botMsg.id), 1000);
                  }
                  handled = true;
                }
              }
            }
          } finally {
            setFetching(false);
          }
        }

        if (!handled) {
          // Fallback: regular movie search
          const movies = await fetchMovies(textToSend);
          if (movies.length > 0) {
            const botMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `🎬 Found movies for **"${textToSend}"**:`,
              timestamp: Date.now(),
              movies
            };
            setMessages(prev => [...prev, botMessage]);
            if (feedbackEnabled) {
              setTimeout(() => setShowRating(botMessage.id), 1000);
            }
          } else {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `🤔 Couldn't find results for **"${textToSend}"**. Try a different movie or actor name!`,
              timestamp: Date.now()
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Sorry, I\'m having trouble. Please try again!',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'actor') {
      setShowPopularActors(true);
      setShowQuickActions(false);
      return;
    }
    if (actionId === 'language') {
      setShowLanguages(true);
      setShowQuickActions(false);
      return;
    }
    if (actionId === 'genre') {
      setShowGenres(true);
      setShowQuickActions(false);
      return;
    }
    handleSend(actionId);
  };

  const handleActorSelect = async (actorId: number, actorName: string) => {
    setLoading(true);
    setShowPopularActors(false);

    const resolvedActor = await searchActor(actorName);
    const actorDetails = await fetchActorDetails(resolvedActor?.id || actorId);

    if (actorDetails) {
      setSelectedActor(actorDetails);
      const actorInfoMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `🎭 **${actorDetails.name}**\n\n📖 **Biography:**\n${actorDetails.biography}\n\n🎂 **Born:** ${actorDetails.birthday || 'N/A'}\n📍 **Birthplace:** ${actorDetails.place_of_birth || 'N/A'}\n\n🎬 **Known For:** ${actorDetails.known_for_department}\n\n🎥 **Popular Movies:** (Click to see details)`,
        timestamp: Date.now(),
        actor: actorDetails,
        movies: actorDetails.movies
      };
      setMessages(prev => [...prev, actorInfoMsg]);
    }

    setLoading(false);
  };

  const handleLanguageSelect = (langCode: string, langName: string) => {
    setShowLanguages(false);
    handleSend(`lang:${langCode}`);
  };

  const handleGenreSelect = (genreId: number, genreName: string) => {
    setShowGenres(false);
    handleSend(`genre:${genreId}`);
  };

  const submitRating = async (rating: number, emoji: string, messageId: string) => {
    try {
      // Create feedback object
      const feedbackData = {
        id: Date.now().toString(),
        rating,
        emoji,
        messageId,
        userId: auth.user?.id,
        timestamp: Date.now()
      };

      // Add to database
      await SimpleDB.feedback.add(feedbackData);
      
      // Legacy local storage fallback
      const existingFeedback = JSON.parse(localStorage.getItem('cinema_feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('cinema_feedback', JSON.stringify(existingFeedback));
      
      setShowRating(null);
      
      const thankYouMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Thank you for your ${rating}-star rating! ${emoji} Your feedback helps us improve.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, thankYouMsg]);
      
      
      // Show quick actions again after rating
      setShowQuickActions(true);
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  const handleMovieClick = async (movie: Movie) => {
    setLoading(true);
    setSelectedMovieDetails(null);

    const details = await fetchMovieDetails(movie.id);

    if (details) {
      setSelectedMovieDetails(details);
      const movieInfoMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `📽️ **${movie.title}**\n\n📖 **Synopsis:**\n${details.overview}\n\n🎭 **Director:** ${details.director}\n⭐ **Rating:** ${details.vote_average.toFixed(1)}\n📅 **Released:** ${details.release_date}\n⏱️ **Runtime:** ${details.runtime} min\n\n👥 **Main Cast:** (Click to see bio)`,
        timestamp: Date.now(),
        cast: details.cast,
        movies: [movie]
      };
      setMessages(prev => [...prev, movieInfoMsg]);
    }

    setLoading(false);
  };

  const handleActorClick = async (actor: CastMember) => {
    setLoading(true);
    setSelectedActor(null);

    const actorDetails = await fetchActorDetails(actor.id);

    if (actorDetails) {
      setSelectedActor(actorDetails);
      const actorInfoMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `🎭 **${actorDetails.name}**\n\n📖 **Biography:**\n${actorDetails.biography}\n\n🎂 **Born:** ${actorDetails.birthday || 'N/A'}\n📍 **Birthplace:** ${actorDetails.place_of_birth || 'N/A'}\n\n🎬 **Known for:** ${actorDetails.known_for_department || actor.character || 'Acting'}\n\n🎥 **Popular Movies:** (Click to see details)`,
        timestamp: Date.now(),
        actor: actorDetails,
        movies: actorDetails.movies
      };
      setMessages(prev => [...prev, actorInfoMsg]);
    }

    setLoading(false);
  };

  const clearChat = () => {
    setChatHistory(messages);
    setMessages([{
      id: 'cleared',
      role: 'assistant',
      content: '🎬 Chat cleared! How can I help you?',
      timestamp: Date.now()
    }]);
    setShowQuickActions(true);
    setShowPopularActors(false);
    setShowLanguages(false);
    setShowGenres(false);
    setShowRating(null);
    setSelectedMovieDetails(null);
    setSelectedActor(null);
  };

  const restoreChat = () => {
    setMessages(chatHistory);
    setChatHistory([]);
    setShowRating(null);
    setSelectedMovieDetails(null);
    setSelectedActor(null);
  };

  const handleBack = () => {
    if (selectedActor) {
      setSelectedActor(null);
    } else if (selectedMovieDetails) {
      setSelectedMovieDetails(null);
    } else if (showPopularActors) {
      setShowPopularActors(false);
      setShowQuickActions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!compact) {
    return <div className="p-4">Compact mode is recommended</div>;
  }

  return (
    <div className={`flex flex-col h-[600px] rounded-3xl overflow-hidden shadow-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-gradient-to-r from-indigo-600 to-purple-600' : 'border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-500'}`}>
        <div className="flex items-center gap-3">
          {(selectedActor || selectedMovieDetails) && (
            <button onClick={handleBack} className="text-white/80 hover:text-white p-1 mr-2">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {selectedActor ? (
              <Users size={20} className="text-white" />
            ) : selectedMovieDetails ? (
              <Film size={20} className="text-white" />
            ) : showPopularActors ? (
              <Users size={20} className="text-white" />
            ) : (
              <Bot size={20} className="text-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {selectedActor ? 'Actor Details' : selectedMovieDetails ? 'Movie Details' : showPopularActors ? 'Popular Actors' : 'ChalaChitra AI'}
            </h3>
            <p className="text-[10px] text-white/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chatHistory.length > 0 && (
            <button onClick={restoreChat} className="text-white/80 hover:text-white p-2" title="Restore">
              <RefreshCcw size={18} />
            </button>
          )}
          <button onClick={clearChat} className="text-white/80 hover:text-white p-2" title="Clear">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        {showQuickActions && !selectedMovieDetails && !selectedActor && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all hover:scale-105 ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 mx-auto shadow-lg`}>
                    {action.id === 'trending' && <TrendingUp size={16} className="text-white" />}
                    {action.id === 'toprated' && <Star size={16} className="text-white" />}
                    {action.id === 'actor' && <Users size={16} className="text-white" />}
                    {action.id === 'language' && <Globe size={16} className="text-white" />}
                    {action.id === 'genre' && <Film size={16} className="text-white" />}
                  </div>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Actors */}
        {showPopularActors && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Popular Actors</p>
            <div className="grid grid-cols-2 gap-2">
              {popularActors.map(actor => (
                <button
                  key={actor.id}
                  onClick={() => handleActorSelect(actor.id, actor.name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl block mb-1">{actor.emoji}</span>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{actor.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Language Options */}
        {showLanguages && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Select Language</p>
            <div className="grid grid-cols-2 gap-2">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code, lang.name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl block mb-1">{lang.emoji}</span>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Genre Options */}
        {showGenres && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Select Genre</p>
            <div className="grid grid-cols-2 gap-2">
              {genres.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreSelect(genre.id, genre.name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl block mb-1">{genre.emoji}</span>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{genre.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>
              {msg.content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
              ))}

              {/* Actor Profile Display */}
              {msg.actor && msg.actor.profile_path && (
                <div className="mt-3 flex items-center gap-3">
                  <img 
                    src={`https://image.tmdb.org/t/p/w185${msg.actor.profile_path}`} 
                    alt={msg.actor.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                  />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400">🎭 Actor Profile</p>
                    <p className="text-[9px] text-white/70">Click movies below to see details</p>
                  </div>
                </div>
              )}

              {/* Movie Grid */}
              {msg.movies && msg.movies.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {msg.movies.map(movie => (
                    <div
                      key={movie.id}
                      onClick={() => handleMovieClick(movie)}
                      className="cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:scale-105 transition-transform hover:border-indigo-500"
                      style={{ background: isDark ? '#1a1a2e' : '#f1f5f9' }}
                    >
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center bg-zinc-800">
                          <Film size={32} className="text-zinc-600" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className={`text-[10px] font-bold line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{movie.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={8} className="text-yellow-500 fill-yellow-500" />
                          <span className={`text-[9px] ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{(movie.vote_average || 0).toFixed(1)}</span>
                          {movie.release_date && (
                            <span className={`text-[9px] ml-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{movie.release_date.slice(0, 4)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Cast Grid */}
              {msg.cast && msg.cast.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {msg.cast.map(actor => (
                    <div
                      key={actor.id}
                      onClick={() => handleActorClick(actor)}
                      className="cursor-pointer rounded-lg overflow-hidden bg-zinc-800 hover:scale-105 transition-transform text-center"
                    >
                      {actor.profile_path ? (
                        <img src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`} alt={actor.name} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-zinc-700 flex items-center justify-center">
                          <Users size={24} className="text-zinc-500" />
                        </div>
                      )}
                      <div className="p-1">
                        <p className="text-[8px] font-bold line-clamp-1">{actor.name}</p>
                        <p className="text-[7px] text-zinc-400 line-clamp-1">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Classifying Indicator */}
        {classifying && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
              <Sparkles size={12} className="animate-spin" />
              Intelligence at work...
            </div>
          </div>
        )}

        {/* Fetching Indicator */}
        {fetching && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] font-bold italic">
              <Loader2 size={12} className="animate-spin" />
              Fetching from TMDB...
            </div>
          </div>
        )}

        {/* Intent Label Toast */}
        {intentLabel && (
          <div className="flex justify-center">
            <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-widest animate-in fade-in">
              🧠 {intentLabel}
            </div>
          </div>
        )}

        {/* Rating Prompt */}
        {showRating && (
          <div className="py-4 animate-in fade-in slide-in-from-bottom-2">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
              <p className="text-xs font-bold text-center mb-3">How was your experience? 🎬</p>
              <div className="flex justify-center gap-2">
                {ratingEmojis.map(({ rating, emoji, label }) => (
                  <button
                    key={rating}
                    onClick={() => submitRating(rating, emoji, showRating)}
                    className="flex flex-col items-center p-2 hover:scale-110 transition-transform"
                    title={label}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="text-[8px] mt-1">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className={`p-3 rounded-2xl flex gap-1 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className={`p-3 border-t flex gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about movies..."
          className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-white/5 text-white placeholder:text-white/40' : 'bg-slate-100 text-slate-900 placeholder:text-slate-400'}`}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatbot;
