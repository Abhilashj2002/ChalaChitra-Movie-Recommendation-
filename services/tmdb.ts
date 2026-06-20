import { Movie } from '../types';

const BASE_URL = 'https://api.tmdb.org/3';
const MIRROR_BASE_URL = 'https://api.tmdb.org/3';
const REQUEST_TIMEOUT_MS = 10000;
const ENV_TMDB_API_KEY = (import.meta as any).env?.VITE_TMDB_API_KEY || '';

export type CacheTag = 'trending' | 'recommendations' | 'search' | 'details' | 'videos' | 'providers' | 'person' | 'person-credits' | 'language' | 'discover';

export const CACHE_DURATIONS: Record<CacheTag | 'DEFAULT', number> = {
  trending: 1000 * 60 * 10,
  recommendations: 1000 * 60 * 30,
  search: 1000 * 60 * 10,
  details: 1000 * 60 * 60 * 24,
  videos: 1000 * 60 * 60 * 24,
  providers: 1000 * 60 * 60 * 12,
  person: 1000 * 60 * 60 * 24,
  'person-credits': 1000 * 60 * 60 * 12,
  language: 1000 * 60 * 60 * 2,
  discover: 1000 * 60 * 30,
  DEFAULT: 1000 * 60 * 30,
};

interface CacheEntry {
  data: any;
  timestamp: number;
  tag: CacheTag;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<any>>();
let preferredBaseUrl = BASE_URL;

const isNetworkFailure = (error: any) => {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('aborterror')
  );
};

export const normalizeSearchResults = (items: any[] = []): Movie[] => {
  if (!items || !Array.isArray(items)) return [];
  return items
    .filter((item: any) => item && item.media_type !== 'person')
    .map((item: any) => ({
      id: item.id,
      title: item.title || item.name || 'Untitled',
      original_title: item.original_title || item.original_name || item.title || item.name || 'Untitled',
      overview: item.overview || '',
      poster_path: item.poster_path || '',
      backdrop_path: item.backdrop_path || item.poster_path || '',
      release_date: item.release_date || item.first_air_date || '',
      vote_average: item.vote_average || 0,
      genre_ids: item.genre_ids || [],
      popularity: item.popularity || 0,
      original_language: item.original_language || 'en',
      media_type: item.media_type
    }))
    .filter((item: Movie) => !!item.id);
};

const fetchWithTimeout = async (url: string, retries: number = 3) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      if (i === retries - 1) {
        clearTimeout(timeoutId);
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  clearTimeout(timeoutId);
  throw new Error('Failed to fetch after retries');
};

const tmdbFetch = async (
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {},
  tag: CacheTag = 'trending'
) => {
  const providedKey = (apiKey || '').trim();
  const envKey = (ENV_TMDB_API_KEY || '').trim();
  const primaryKey = providedKey || envKey;

  if (!primaryKey) {
    throw new Error('API_KEY_MISSING');
  }

  const cacheDuration = CACHE_DURATIONS[tag] || CACHE_DURATIONS.DEFAULT;

  const requestAgainst = async (baseUrl: string, keyToUse: string | null) => {
    const requestParams = keyToUse
      ? { api_key: keyToUse, ...params }
      : { ...params };
    const query = new URLSearchParams(requestParams).toString();
    const url = `${baseUrl}${endpoint}?${query}`;

    if (cache.has(url)) {
      const cached = cache.get(url)!;
      if (Date.now() - cached.timestamp < cacheDuration) {
        return cached.data;
      }
    }

    if (inFlight.has(url)) {
      return inFlight.get(url)!;
    }

    const requestPromise = (async () => {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API_KEY_INVALID');
        }
        if (response.status === 404) {
          throw new Error('NOT_FOUND');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.status_message || `TMDB API Error: ${response.status}`);
      }

      const data = await response.json();
      const sanitized = Array.isArray(data?.results)
        ? { ...data, results: data.results.filter((item: any) => !item?.adult) }
        : data;

      cache.set(url, { data: sanitized, timestamp: Date.now(), tag });
      return sanitized;
    })();

    inFlight.set(url, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inFlight.delete(url);
    }
  };

  try {
    // Try mirror first (more reliable), then main API
    const orderedBases = [MIRROR_BASE_URL, BASE_URL];

    let lastError: any = null;

    for (const base of orderedBases) {
      try {
        if (base === BASE_URL) {
          try {
            const data = await requestAgainst(BASE_URL, primaryKey);
            preferredBaseUrl = BASE_URL;
            return data;
          } catch (primaryError: any) {
            const canFallbackToEnv =
              primaryError?.message === 'API_KEY_INVALID' &&
              !!envKey &&
              envKey !== primaryKey;

            if (canFallbackToEnv) {
              const data = await requestAgainst(BASE_URL, envKey);
              preferredBaseUrl = BASE_URL;
              return data;
            }
            throw primaryError;
          }
        }

        const data = await requestAgainst(MIRROR_BASE_URL, null);
        preferredBaseUrl = MIRROR_BASE_URL;
        return data;
      } catch (error: any) {
        lastError = error;
        if (!isNetworkFailure(error) && error?.message !== 'API_KEY_INVALID') {
          throw error;
        }
      }
    }

    throw lastError || new Error('NETWORK_ERROR - Check your internet connection');
  } catch (error: any) {
    console.error('TMDB Fetch Error:', error);
    if (isNetworkFailure(error)) {
      throw new Error('NETWORK_ERROR - Check your internet connection');
    }
    throw error;
  }
};

export const TMDB = {
  clearCache: () => {
    cache.clear();
  },

  invalidateTags: (tags: CacheTag[]) => {
    for (const [key, entry] of cache.entries()) {
      if (tags.includes(entry.tag)) {
        cache.delete(key);
      }
    }
  },

  fetch: tmdbFetch,

  getTrending: (apiKey: string, page: number = 1) =>
    tmdbFetch('/trending/movie/week', apiKey, { page: page.toString() }, 'trending'),

  getTrendingMovies: (apiKey: string, page: number = 1) =>
    tmdbFetch('/trending/movie/week', apiKey, { page: page.toString() }, 'trending'),

  getTrendingTV: (apiKey: string, page: number = 1) =>
    tmdbFetch('/trending/tv/week', apiKey, { page: page.toString() }, 'trending'),

  getTrendingCombined: async (apiKey: string, minItems: number = 20) => {
    try {
      const [movieRes, tvRes] = await Promise.allSettled([
        tmdbFetch('/trending/movie/week', apiKey, { page: '1' }, 'trending'),
        tmdbFetch('/trending/tv/week', apiKey, { page: '1' }, 'trending')
      ]);

      const movies = movieRes.status === 'fulfilled' ? movieRes.value?.results || [] : [];
      const tvShows = tvRes.status === 'fulfilled' ? tvRes.value?.results || [] : [];

      const combined = [
        ...normalizeSearchResults(movies),
        ...normalizeSearchResults(tvShows.map((tv: any) => ({
          ...tv,
          title: tv.name,
          original_title: tv.original_name,
          release_date: tv.first_air_date,
          media_type: 'tv'
        })))
      ];

      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(m => m.id === item.id)
      ).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      if (unique.length < minItems) {
        const [moviePage2, tvPage2] = await Promise.allSettled([
          tmdbFetch('/trending/movie/week', apiKey, { page: '2' }, 'trending'),
          tmdbFetch('/trending/tv/week', apiKey, { page: '2' }, 'trending')
        ]);

        const moreMovies = moviePage2.status === 'fulfilled' ? moviePage2.value?.results || [] : [];
        const moreTV = tvPage2.status === 'fulfilled' ? tvPage2.value?.results || [] : [];

        const moreCombined = [
          ...normalizeSearchResults(moreMovies),
          ...normalizeSearchResults(moreTV.map((tv: any) => ({
            ...tv,
            title: tv.name,
            original_title: tv.original_name,
            release_date: tv.first_air_date,
            media_type: 'tv'
          })))
        ];

        for (const item of moreCombined) {
          if (!unique.find(u => u.id === item.id)) {
            unique.push(item);
          }
        }
      }

      return { results: unique.slice(0, Math.max(minItems, unique.length)) };
    } catch (error) {
      console.error('Failed to fetch combined trending:', error);
      return { results: [] };
    }
  },

  getRecommendations: (apiKey: string, genreIds: number[], priorityLang: string | null, page: number = 1) => {
    const params: any = {
      sort_by: 'popularity.desc',
      page: page.toString()
    };
    if (genreIds.length > 0) params.with_genres = genreIds.join(',');
    if (priorityLang) params.with_original_language = priorityLang;
    return tmdbFetch('/discover/movie', apiKey, params, 'recommendations');
  },

  getMovieRecommendations: (apiKey: string, movieId: number, page: number = 1) =>
    tmdbFetch(`/movie/${movieId}/recommendations`, apiKey, { page: page.toString() }, 'recommendations'),

  getGenreMovies: (apiKey: string, genreIds: number[], page: number = 1) =>
    tmdbFetch('/discover/movie', apiKey, { with_genres: genreIds.join(','), sort_by: 'popularity.desc', page: page.toString() }, 'recommendations'),

  getLanguageMovies: (apiKey: string, language: string, page: number = 1) =>
    tmdbFetch('/discover/movie', apiKey, { with_original_language: language, sort_by: 'popularity.desc', page: page.toString() }, 'language'),

  getLanguageMoviesWithFilters: (apiKey: string, language: string, genreIds: number[] = [], sortBy: string = 'popularity.desc', page: number = 1) => {
    const params: any = {
      sort_by: sortBy,
      page: page.toString(),
      with_original_language: language
    };
    if (genreIds.length > 0) params.with_genres = genreIds.join(',');
    return tmdbFetch('/discover/movie', apiKey, params, 'language');
  },

  getMoviesByGenre: async (apiKey: string, genreIds: number[], page: number = 1) => {
    if (genreIds.length === 0) return { results: [] as Movie[] };
    return tmdbFetch('/discover/movie', apiKey, {
      with_genres: genreIds.join(','),
      sort_by: 'popularity.desc',
      page: page.toString()
    }, 'recommendations');
  },

  getRelatedContent: async (apiKey: string, query: string, genreIds: number[] = []) => {
    try {
      const genreMapping: Record<string, number[]> = {
        'action': [28],
        'comedy': [35],
        'horror': [27],
        'romance': [10749],
        'drama': [18],
        'thriller': [53],
        'sci-fi': [878],
        'science fiction': [878],
        'animation': [16],
        'anime': [16],
        'documentary': [99],
        'family': [10751],
        'adventure': [12],
        'fantasy': [14],
        'crime': [80],
        'mystery': [9648]
      };

      const queryLower = query.toLowerCase();
      let targetGenres = genreIds;

      for (const [term, genres] of Object.entries(genreMapping)) {
        if (queryLower.includes(term)) {
          targetGenres = genres;
          break;
        }
      }

      if (targetGenres.length > 0) {
        const result = await tmdbFetch('/discover/movie', apiKey, {
          with_genres: targetGenres.join(','),
          sort_by: 'popularity.desc',
          page: '1'
        }, 'recommendations');
        return result.results || [];
      }

      const trending = await tmdbFetch('/trending/movie/week', apiKey, { page: '1' }, 'trending');
      return trending.results || [];
    } catch (error) {
      console.error('Failed to get related content:', error);
      return [];
    }
  },

  discoverMovies: (apiKey: string, params: Record<string, string> = {}, page: number = 1) => {
    const fetchParams = { ...params, page: page.toString() };
    return tmdbFetch('/discover/movie', apiKey, fetchParams, 'discover');
  },

  searchWithMulti: (apiKey: string, query: string, page: number = 1) =>
    tmdbFetch('/search/multi', apiKey, { query, page: page.toString() }, 'search'),

  searchPerson: (apiKey: string, query: string, page: number = 1) =>
    tmdbFetch('/search/person', apiKey, { query, page: page.toString() }, 'search'),

  getTVShowDetails: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}`, apiKey, {}, 'details'),

  getTVShowVideos: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}/videos`, apiKey, {}, 'videos'),

  getTVShowCredits: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}/credits`, apiKey, {}, 'details'),

  getTVShowReviews: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}/reviews`, apiKey, {}, 'details'),

  getTVShowRecommendations: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}/recommendations`, apiKey, {}, 'recommendations'),

  getTVShowWatchProviders: (apiKey: string, tvId: number) =>
    tmdbFetch(`/tv/${tvId}/watch/providers`, apiKey, {}, 'providers'),

  getBlockbusters: (apiKey: string, page: number = 1) =>
    tmdbFetch('/discover/movie', apiKey, {
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2025-12-31',
      'vote_count.gte': '200',
      sort_by: 'popularity.desc',
      page: page.toString()
    }, 'recommendations'),

  getHiddenGems: (apiKey: string, page: number = 1) => {
    return tmdbFetch('/discover/movie', apiKey, {
      'vote_average.gte': '8',
      'vote_count.gte': '100',
      'popularity.lte': '15',
      sort_by: 'vote_average.desc',
      page: page.toString()
    }, 'trending');
  },

  search: (apiKey: string, query: string, page: number = 1) =>
    tmdbFetch('/search/movie', apiKey, { query, page: page.toString() }, 'search'),

  getMovieDetails: (apiKey: string, movieId: number) =>
    tmdbFetch(`/movie/${movieId}`, apiKey, {}, 'details'),

  getMovieCredits: (apiKey: string, movieId: number) =>
    tmdbFetch(`/movie/${movieId}/credits`, apiKey, {}, 'details'),

  getMovieReviews: (apiKey: string, movieId: number) =>
    tmdbFetch(`/movie/${movieId}/reviews`, apiKey, {}, 'details'),

  getMovieVideos: (apiKey: string, movieId: number) =>
    tmdbFetch(`/movie/${movieId}/videos`, apiKey, {}, 'videos'),

  getWatchProviders: (apiKey: string, movieId: number) =>
    tmdbFetch(`/movie/${movieId}/watch/providers`, apiKey, {}, 'providers'),

  getPersonDetails: (apiKey: string, personId: number) =>
    tmdbFetch(`/person/${personId}`, apiKey, {}, 'person'),

  getPersonMovieCredits: (apiKey: string, personId: number) =>
    tmdbFetch(`/person/${personId}/movie_credits`, apiKey, {}, 'person-credits')
};
