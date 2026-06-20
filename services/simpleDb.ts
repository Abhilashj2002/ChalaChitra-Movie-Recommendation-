import { User, UserRole, UserPreferences, SiteFeedback, ChatbotFeedback } from '../types';

const API_BASE = 'http://localhost:3002/api';
const DB_KEY = 'cinema_db_fallback';

const FALLBACK_PROJECT_LANGS = [
  { id: 1,  name: 'TypeScript', category: 'Frontend', description: 'Typed superset of JavaScript for React components', color: '#3178c6', icon: 'TS', version: '5.7',        usage_area: 'UI Components, Types, Services' },
  { id: 2,  name: 'JavaScript', category: 'Backend',  description: 'Runtime language for the Express API server',       color: '#f7df1e', icon: 'JS', version: 'ES2022',     usage_area: 'API Server, Build Scripts' },
  { id: 3,  name: 'React',      category: 'Framework',description: 'UI library for the single-page application',       color: '#61dafb', icon: 'Re', version: '19',         usage_area: 'Pages, Components' },
  { id: 4,  name: 'Vite',       category: 'Tooling',  description: 'Fast frontend build tool and dev server',           color: '#646cff', icon: 'Vi', version: '6',          usage_area: 'Build, HMR, Dev Server' },
  { id: 5,  name: 'Express',    category: 'Backend',  description: 'Node.js web framework for the REST API',           color: '#68a063', icon: 'Ex', version: '4',          usage_area: 'REST API, Routing' },
  { id: 6,  name: 'SQLite',     category: 'Database', description: 'Embedded SQL database via sql.js',                  color: '#003b57', icon: 'DB', version: 'sql.js 1.12',usage_area: 'Users, History, Ratings, Settings' },
  { id: 7,  name: 'TailwindCSS',category: 'Styling',  description: 'Utility-first CSS framework',                       color: '#38bdf8', icon: 'TW', version: '3.4',        usage_area: 'Styling, Layout' },
  { id: 8,  name: 'HTML',       category: 'Markup',   description: 'Markup for the application shell',                  color: '#e34c26', icon: 'HT', version: '5',          usage_area: 'App Shell, Templates' },
  { id: 9,  name: 'CSS',        category: 'Styling',  description: 'Global styles and CSS variables',                   color: '#264de4', icon: 'CS', version: '3',          usage_area: 'Animations, Variables' },
  { id: 10, name: 'Node.js',    category: 'Runtime',  description: 'JavaScript runtime for the backend server',         color: '#68a063', icon: 'No', version: '24',         usage_area: 'Backend Runtime' },
  { id: 11, name: 'SQL',        category: 'Database', description: 'Query language used against SQLite',                color: '#f29111', icon: 'SQ', version: 'SQLite 3',   usage_area: 'Queries, Migrations' },
  { id: 12, name: 'JSON',       category: 'Data',     description: 'Data exchange format for API payloads',             color: '#cbcb41', icon: '{}', version: '-',          usage_area: 'API Payloads, Config' },
];

// Fallback to localStorage when backend is unavailable
let useFallback = false;

interface FallbackDB {
  settings: Record<string, string>;
  users: any[];
  history: Record<string, number[]>;
  ratings: Record<string, Record<number, number>>;
  feedback: ChatbotFeedback[];
  siteFeedback: SiteFeedback[];
}

function getFallbackDB(): FallbackDB {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    try {
      const db = JSON.parse(stored);
      normalizeFallbackAdmin(db);
      return db;
    } catch {
      return createFallbackDB();
    }
  }
  return createFallbackDB();
}

function createFallbackDB(): FallbackDB {
  return {
    settings: {
      tmdb_api_key: (import.meta as any).env?.VITE_TMDB_API_KEY || '',
      omdb_api_key: '',
      chatbot_feedback_enabled: 'true',
      hp_feedback_enabled: 'true'
    },
    users: [
      { id: '1', username: 'chalachitra@gmail.com', email: 'chalachitra@gmail.com', password: 'Admin@1234', role: 'ADMIN', preferences: { genres: [], languages: [], moods: [], priorityLanguage: null } },
      { id: '2', username: 'user', email: 'user@cinema.com', password: 'user123', role: 'USER', preferences: { genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: null } }
    ],
    history: {},
    ratings: {},
    feedback: [],
    siteFeedback: []
  };
}

function saveFallbackDB(db: FallbackDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function normalizeFallbackAdmin(db: FallbackDB) {
  if (!db.users) db.users = [];

  const admin = db.users.find((user: any) => user.id === '1' || user.role === 'ADMIN');
  if (!admin) {
    db.users.unshift({
      id: '1',
      username: 'chalachitra@gmail.com',
      email: 'chalachitra@gmail.com',
      password: 'Admin@1234',
      role: 'ADMIN',
      preferences: { genres: [], languages: [], moods: [], priorityLanguage: null },
    });
  } else {
    admin.id = admin.id || '1';
    admin.username = 'chalachitra@gmail.com';
    admin.email = 'chalachitra@gmail.com';
    admin.password = 'Admin@1234';
    admin.role = 'ADMIN';
    admin.preferences = admin.preferences || { genres: [], languages: [], moods: [], priorityLanguage: null };
  }

  saveFallbackDB(db);
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    return await apiRequest<T>(endpoint, options);
  } catch {
    useFallback = true;
    return null;
  }
}

export const SimpleDB = {
  settings: {
    get: async (key: string): Promise<string | null> => {
      if (!useFallback) {
        const result = await tryApi<{ value: string | null }>(`/settings/${key}`);
        if (result !== null) return result.value;
      }
      const db = getFallbackDB();
      return db.settings ? db.settings[key] || null : null;
    },
    set: async (key: string, value: string) => {
      if (!useFallback) {
        const result = await tryApi('/settings', {
          method: 'POST',
          body: JSON.stringify({ key, value }),
        });
        if (result !== null) return;
      }
      const db = getFallbackDB();
      if (!db.settings) db.settings = {};
      db.settings[key] = value;
      saveFallbackDB(db);
    },
    getAll: async (): Promise<Record<string, string>> => {
      if (!useFallback) {
        const result = await tryApi<Record<string, string>>('/settings');
        if (result !== null) return result;
      }
      return getFallbackDB().settings || {};
    }
  },

  users: {
    register: async (username: string, email: string, password: string, role: UserRole = UserRole.USER): Promise<User> => {
      if (!useFallback) {
        const result = await tryApi<User>('/users/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password, role }),
        });
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      if (!db.users) db.users = [];
      if (db.users.some((u: any) => u.email === email)) {
        throw new Error('Email already registered');
      }
      const id = Math.random().toString(36).substring(2, 11);
      const user: User = {
        id,
        username,
        email,
        role,
        preferences: { genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: null }
      };
      db.users.push({ ...user, password });
      saveFallbackDB(db);
      return user;
    },

    authenticate: async (email: string, password: string): Promise<User | undefined> => {
      if (!useFallback) {
        const result = await tryApi<User>('/users/authenticate', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      if (!db.users) return undefined;
      const userWithPassword = db.users.find((u: any) => (u.email === email || u.username === email) && u.password === password);
      if (userWithPassword) {
        const { password: _, ...user } = userWithPassword;
        return user;
      }
      return undefined;
    },

    updateTMDBKey: async (userId: string, key: string) => {
      if (!useFallback) {
        const result = await tryApi(`/users/${userId}/tmdb-key`, {
          method: 'PUT',
          body: JSON.stringify({ key }),
        });
        if (result !== null) return;
      }
      const db = getFallbackDB();
      if (!db.users) return;
      const user = db.users.find((u: any) => u.id === userId);
      if (user) {
        user.tmdbApiKey = key;
        saveFallbackDB(db);
      }
    },

    updatePreferences: async (userId: string, prefs: UserPreferences) => {
      if (!useFallback) {
        await tryApi(`/users/${userId}/preferences`, {
          method: 'PUT',
          body: JSON.stringify(prefs),
        });
      }
      const db = getFallbackDB();
      if (!db.users) return;
      const user = db.users.find((u: any) => u.id === userId);
      if (user) {
        user.preferences = prefs;
        saveFallbackDB(db);
      }
    },

    getAll: async (): Promise<User[]> => {
      if (!useFallback) {
        const result = await tryApi<User[]>('/users');
        if (result !== null) return result;
      }
      return (getFallbackDB().users || []).map(({ password, ...u }: any) => u);
    }
  },

  history: {
    add: async (userId: string, movieId: number) => {
      if (!useFallback) {
        await tryApi('/history', {
          method: 'POST',
          body: JSON.stringify({ userId, movieId }),
        });
      }
      const db = getFallbackDB();
      if (!db.history) db.history = {};
      if (!db.history[userId]) db.history[userId] = [];
      if (!db.history[userId].includes(movieId)) {
        db.history[userId].unshift(movieId);
        saveFallbackDB(db);
      }
    },

    remove: async (userId: string, movieId: number) => {
      if (!useFallback) {
        await tryApi(`/history/${userId}/${movieId}`, { method: 'DELETE' });
      }
      const db = getFallbackDB();
      if (db.history && db.history[userId]) {
        db.history[userId] = db.history[userId].filter(id => id !== movieId);
        saveFallbackDB(db);
      }
    },

    exists: async (userId: string, movieId: number): Promise<boolean> => {
      if (!useFallback) {
        const result = await tryApi<{ exists: boolean }>(`/history/${userId}/exists/${movieId}`);
        if (result !== null) return result.exists;
      }
      const db = getFallbackDB();
      return db.history ? db.history[userId]?.includes(movieId) || false : false;
    },

    get: async (userId: string): Promise<number[]> => {
      if (!useFallback) {
        const result = await tryApi<number[]>(`/history/${userId}`);
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      return db.history ? db.history[userId] || [] : [];
    }
  },

  ratings: {
    set: async (userId: string, movieId: number, rating: number) => {
      if (!useFallback) {
        await tryApi('/ratings', {
          method: 'POST',
          body: JSON.stringify({ userId, movieId, rating }),
        });
      }
      const db = getFallbackDB();
      if (!db.ratings) db.ratings = {};
      if (!db.ratings[userId]) db.ratings[userId] = {};
      db.ratings[userId][movieId] = rating;
      saveFallbackDB(db);
    },

    get: async (userId: string, movieId: number): Promise<number | null> => {
      if (!useFallback) {
        const result = await tryApi<{ rating: number | null }>(`/ratings/${userId}/${movieId}`);
        if (result !== null) return result.rating;
      }
      const db = getFallbackDB();
      return db.ratings ? db.ratings[userId]?.[movieId] || null : null;
    },

    getForUser: async (userId: string): Promise<Record<number, number>> => {
      if (!useFallback) {
        const result = await tryApi<Record<number, number>>(`/ratings/${userId}`);
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      return db.ratings ? db.ratings[userId] || {} : {};
    }
  },

  feedback: {
    add: async (feedback: ChatbotFeedback) => {
      if (!useFallback) {
        await tryApi('/feedback/chatbot', {
          method: 'POST',
          body: JSON.stringify(feedback),
        });
      }
      const db = getFallbackDB();
      if (!db.feedback) db.feedback = [];
      db.feedback.push(feedback);
      saveFallbackDB(db);
    },

    getAll: async (): Promise<ChatbotFeedback[]> => {
      if (!useFallback) {
        const result = await tryApi<ChatbotFeedback[]>('/feedback/chatbot');
        if (result !== null) return result;
      }
      return getFallbackDB().feedback || [];
    },

    getStats: async (): Promise<{ total: number; average: number }> => {
      if (!useFallback) {
        const result = await tryApi<{ total: number; average: number }>('/feedback/chatbot/stats');
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      const feedbackArray = db.feedback || [];
      if (feedbackArray.length === 0) return { total: 0, average: 0 };
      const total = feedbackArray.length;
      const sum = feedbackArray.reduce((acc, f) => acc + f.rating, 0);
      return { total, average: sum / total };
    }
  },

  siteFeedback: {
    add: async (feedback: SiteFeedback) => {
      if (!useFallback) {
        await tryApi('/feedback/site', {
          method: 'POST',
          body: JSON.stringify(feedback),
        });
      }
      const db = getFallbackDB();
      if (!db.siteFeedback) db.siteFeedback = [];
      db.siteFeedback.unshift(feedback);
      saveFallbackDB(db);
    },

    getAll: async (): Promise<SiteFeedback[]> => {
      if (!useFallback) {
        const result = await tryApi<SiteFeedback[]>('/feedback/site');
        if (result !== null) return result;
      }
      return getFallbackDB().siteFeedback || [];
    },

    delete: async (id: string) => {
      if (!useFallback) {
        await tryApi(`/feedback/site/${id}`, { method: 'DELETE' });
      }
      const db = getFallbackDB();
      if (db.siteFeedback) {
        db.siteFeedback = db.siteFeedback.filter(f => f.id !== id);
      }
      saveFallbackDB(db);
    }
  },

  movies: {
    getAll: async () => {
      if (!useFallback) {
        const result = await tryApi<any[]>('/movies');
        if (result !== null) return result;
      }
      return [];
    },
    add: async (movie: any) => {
      if (!useFallback) {
        await tryApi('/movies', {
          method: 'POST',
          body: JSON.stringify(movie),
        });
      }
    }
  },

  shortFilms: {
    getAll: async () => {
      if (!useFallback) {
        const result = await tryApi<any[]>('/short-films');
        if (result !== null) return result;
      }
      return [];
    },
    add: async (film: any) => {
      if (!useFallback) {
        await tryApi('/short-films', {
          method: 'POST',
          body: JSON.stringify(film),
        });
      }
    }
  },

  projectLanguages: {
    getAll: async (category?: string): Promise<any[]> => {
      if (!useFallback) {
        const qs = category ? `?category=${encodeURIComponent(category)}` : '';
        const result = await tryApi<any[]>(`/project/languages${qs}`);
        if (result !== null) return result;
      }
      return FALLBACK_PROJECT_LANGS;
    },

    getById: async (id: number): Promise<any | null> => {
      if (!useFallback) {
        const result = await tryApi<any>(`/project/languages/${id}`);
        if (result !== null) return result;
      }
      return FALLBACK_PROJECT_LANGS.find(l => l.id === id) || null;
    },

    getCategories: async (): Promise<string[]> => {
      if (!useFallback) {
        const result = await tryApi<string[]>('/project/languages/categories');
        if (result !== null) return result;
      }
      return [...new Set(FALLBACK_PROJECT_LANGS.map(l => l.category))].sort();
    },

    add: async (lang: { name: string; category: string; description?: string; color?: string; icon?: string; version?: string; usage_area?: string }): Promise<any> => {
      if (!useFallback) {
        const result = await tryApi<any>('/project/languages', {
          method: 'POST',
          body: JSON.stringify(lang),
        });
        if (result !== null) return result;
      }
      throw new Error('Backend unavailable');
    },

    update: async (id: number, patch: Partial<{ name: string; category: string; description: string; color: string; icon: string; version: string; usage_area: string }>): Promise<void> => {
      if (!useFallback) {
        await tryApi(`/project/languages/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        });
      }
    },

    delete: async (id: number): Promise<void> => {
      if (!useFallback) {
        await tryApi(`/project/languages/${id}`, { method: 'DELETE' });
      }
    }
  },

  languages: {
    // All supported languages from the database
    getAll: async (): Promise<Array<{ code: string; name: string; flag: string }>> => {
      if (!useFallback) {
        const result = await tryApi<Array<{ code: string; name: string; flag: string }>>('/languages');
        if (result !== null) return result;
      }
      // fallback static list
      return [
        { code: 'en', name: 'English',    flag: '🇺🇸' },
        { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
        { code: 'kn', name: 'Kannada',    flag: '🇮🇳' },
        { code: 'te', name: 'Telugu',     flag: '🇮🇳' },
        { code: 'ta', name: 'Tamil',      flag: '🇮🇳' },
        { code: 'ml', name: 'Malayalam',  flag: '🇮🇳' },
        { code: 'bn', name: 'Bengali',    flag: '🇮🇳' },
        { code: 'mr', name: 'Marathi',    flag: '🇮🇳' },
        { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
        { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
        { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
        { code: 'fr', name: 'French',     flag: '🇫🇷' },
        { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
        { code: 'de', name: 'German',     flag: '🇩🇪' },
        { code: 'it', name: 'Italian',    flag: '🇮🇹' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'ru', name: 'Russian',    flag: '🇷🇺' },
      ];
    },

    // Get a user's stored language preferences
    getUserLanguages: async (userId: string): Promise<{ languages: string[]; priorityLanguage: string | null }> => {
      if (!useFallback) {
        const result = await tryApi<{ languages: string[]; priorityLanguage: string | null }>(`/languages/${userId}`);
        if (result !== null) return result;
      }
      const db = getFallbackDB();
      if (!db.users) return { languages: [], priorityLanguage: null };
      const user = db.users.find((u: any) => u.id === userId);
      return {
        languages: user?.preferences?.languages || [],
        priorityLanguage: user?.preferences?.priorityLanguage || null
      };
    },

    // Save user's preferred language list
    setUserLanguages: async (userId: string, languages: string[]): Promise<void> => {
      if (!useFallback) {
        const result = await tryApi(`/languages/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ languages }),
        });
        if (result !== null) return;
      }
      const db = getFallbackDB();
      if (!db.users) return;
      const user = db.users.find((u: any) => u.id === userId);
      if (user) { user.preferences = { ...user.preferences, languages }; saveFallbackDB(db); }
    },

    // Set user's priority / UI language
    setPriority: async (userId: string, priorityLanguage: string | null): Promise<void> => {
      if (!useFallback) {
        const result = await tryApi(`/languages/${userId}/priority`, {
          method: 'PUT',
          body: JSON.stringify({ priorityLanguage }),
        });
        if (result !== null) return;
      }
      const db = getFallbackDB();
      if (!db.users) return;
      const user = db.users.find((u: any) => u.id === userId);
      if (user) { user.preferences = { ...user.preferences, priorityLanguage }; saveFallbackDB(db); }
    }
  },

  // Check backend connection
  checkConnection: async (): Promise<boolean> => {
    try {
      const rootBase = API_BASE.replace('/api', '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(`${rootBase}/health`, { signal: controller.signal });
        useFallback = !response.ok;
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      useFallback = true;
      return false;
    }
  }
};
