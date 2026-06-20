
export enum Language {
  EN = 'en',
  KN = 'kn',
  HI = 'hi',
  TE = 'te',
  TA = 'ta',
  ML = 'ml',
  BN = 'bn',
  MR = 'mr',
  JA = 'ja',
  KO = 'ko'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  preferences: UserPreferences;
  tmdbApiKey?: string;
}

export interface UserPreferences {
  genres: number[];
  languages: string[];
  moods: string[];
  priorityLanguage: string | null;
}

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  popularity: number;
  original_language: string;
  media_type?: 'movie' | 'tv';
}

export interface Genre {
  id: number;
  name: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface MoodConfig {
  id: string;
  labelEn: string;
  labelKn: string;
  icon: string;
  genres: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  movies?: Movie[];
  relatedMovies?: Movie[];
  actorInfo?: {
    movie: Movie;
    cast: any[];
  };
  actor?: {
    name: string;
    biography: string;
    birthday?: string | null;
    place_of_birth?: string | null;
    profile_path?: string | null;
  };
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }[];
}

export interface SiteFeedback {
  id: string;
  name: string;
  message: string;
  rating?: number;
  userId?: string;
  timestamp: number;
}

export interface ChatbotFeedback {
  id: string;
  rating: number;
  emoji: string;
  messageId: string;
  userId?: string;
  timestamp: number;
}
