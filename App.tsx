
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  Home, Search, Film, User as UserIcon, MessageCircle,
  Settings, LogOut, LayoutDashboard, Globe, ChevronRight,
  Sun, Moon, ChevronDown, Sparkles, Bot, X
} from 'lucide-react';
import { AuthState, Language, User, UserRole, Movie, Theme } from './types';
import { TRANSLATIONS, MOODS } from './constants';
import { SimpleDB as DB } from './services/simpleDb';
import { TMDB } from './services/tmdb';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import MoodPage from './pages/MoodPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AdminChatbotPage from './pages/AdminChatbotPage';
import SearchPage from './pages/SearchPage';
import DiscoverPage from './pages/DiscoverPage';
import AnimePage from './pages/AnimePage';
import ShortFilmsPage from './pages/ShortFilmsPage';
import SeriesPage from './pages/SeriesPage';
import LanguagePage from './pages/LanguagePage';
import LogoutSuccess from './pages/LogoutSuccess';
import MovieDetailModal from './components/MovieDetailModal';
import { AppContext, useApp } from './context/AppContext';

const ENV_TMDB_API_KEY = (import.meta as any).env?.VITE_TMDB_API_KEY || '';

const getColorLuminance = (color: string) => {
  const normalized = color.trim().toLowerCase();
  const namedColors: Record<string, string> = { black: '#000000', white: '#ffffff' };
  const hex = namedColors[normalized] || normalized;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);

  if (!match) return null;

  const [r, g, b] = match[1].match(/.{2}/g)!.map(part => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ensureReadableThemeText = (background: string | null, text: string | null, mode: Theme) => {
  if (!background || !text) return text;

  const bgLuminance = getColorLuminance(background);
  const textLuminance = getColorLuminance(text);

  if (bgLuminance === null || textLuminance === null) return text;

  const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) / (Math.min(bgLuminance, textLuminance) + 0.05);
  if (contrast >= 4.5) return text;

  return mode === Theme.LIGHT ? '#0f172a' : '#ffffff';
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useApp();
  return auth.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};



const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [authLoaded, setAuthLoaded] = useState(false);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [selectedMovie, setSelectedMovieState] = useState<Movie | null>(null);
  const [autoPlayTrailer, setAutoPlayTrailer] = useState(false);
  const [systemKey, setSystemKeyState] = useState<string | null>(null);
  const [omdbKey, setOmdbKeyState] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [themeBackground, setThemeBackground] = useState<string | null>(null);
  const [themeText, setThemeText] = useState<string | null>(null);

  useEffect(() => {
    // Debug utility: expose clearDatabase function
    (window as any).clearDatabase = () => {
      localStorage.removeItem('cm_auth');
      localStorage.removeItem('cm_theme');
      localStorage.removeItem('cm_lang');
      localStorage.removeItem('cinema_mithra_sqlite');
      indexedDB.deleteDatabase('CinemaDatabase');
      console.log('✓ All stored data cleared. Refresh the page.');
    };

    // Initial health check
    DB.checkConnection();

    const savedAuth = localStorage.getItem('cm_auth');
    if (savedAuth) {
      try {
        setAuth(JSON.parse(savedAuth));
      } catch {
        localStorage.removeItem('cm_auth');
      }
    }
    setAuthLoaded(true);

    const savedTheme = localStorage.getItem('cm_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } else {
      document.documentElement.className = 'dark';
    }

    const savedLang = localStorage.getItem('cm_lang') as Language;
    if (savedLang) setLang(savedLang);

    DB.settings.get('tmdb_api_key').then(key => {
      const tmdbKey = key || ENV_TMDB_API_KEY;
      setSystemKeyState(tmdbKey || null);
      if (!key && ENV_TMDB_API_KEY) DB.settings.set('tmdb_api_key', ENV_TMDB_API_KEY);
    });

    // Fetch Global OMDB Key
    DB.settings.get('omdb_api_key').then(key => {
      setOmdbKeyState(key || null);
    });
    
    // Fetch Theme Colors - Only apply if they exist, otherwise let CSS variables take over
    DB.settings.get('theme_color').then(color => color && setThemeColor(color));
    DB.settings.get('theme_background').then(bg => bg && setThemeBackground(bg));
    DB.settings.get('theme_text').then(text => text && setThemeText(text));
  }, []);
  
  // Apply theme colors to CSS variables
  useEffect(() => {
    const readableThemeText = ensureReadableThemeText(themeBackground, themeText, theme);

    if (themeColor) document.documentElement.style.setProperty('--theme-primary', themeColor);
    if (themeBackground) document.documentElement.style.setProperty('--theme-background', themeBackground);
    if (readableThemeText) document.documentElement.style.setProperty('--theme-text', readableThemeText);
  }, [themeColor, themeBackground, themeText, theme]);

  const toggleTheme = () => {
    const newTheme = theme === Theme.DARK ? Theme.LIGHT : Theme.DARK;
    setTheme(newTheme);
    localStorage.setItem('cm_theme', newTheme);
    document.documentElement.className = newTheme;

    // IMPORTANT: Clear forced style overrides from database when toggling manually
    // This allows the CSS variables defined in index.css (.light / :root) to take control
    document.documentElement.style.removeProperty('--theme-background');
    document.documentElement.style.removeProperty('--theme-text');
    setThemeBackground(null);
    setThemeText(null);
  };

  const setLangWithStorage = (l: Language) => {
    setLang(l);
    localStorage.setItem('cm_lang', l);
  };

  const setSelectedMovie = (movie: Movie | null, autoPlay: boolean = false) => {
    setSelectedMovieState(movie);
    setAutoPlayTrailer(autoPlay);
  };

  const setUser = (user: User) => {
    const state = { user, token: 'mock-jwt-token-' + user.id, isAuthenticated: true };
    setAuth(state);
    localStorage.setItem('cm_auth', JSON.stringify(state));
  };

  const logout = () => {
    setAuth({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('cm_auth');
    TMDB.clearCache();
    // Navigate to signed-out page using hash router
    window.location.href = '/#/signed-out';
  };

  const updateUser = (updatedUser: User) => {
    setAuth(prev => {
      const newState = { ...prev, user: updatedUser };
      localStorage.setItem('cm_auth', JSON.stringify(newState));
      TMDB.invalidateTags(['recommendations']);
      return newState;
    });
  };

  const setSystemKey = (key: string) => {
    setSystemKeyState(key);
    DB.settings.set('tmdb_api_key', key);
  };

  const setOmdbKey = (key: string) => {
    setOmdbKeyState(key);
    DB.settings.set('omdb_api_key', key);
  };

  const t = (key: string) => {
    return (TRANSLATIONS[lang] as any)[key] || (TRANSLATIONS['en'] as any)[key] || key;
  };

  return (
    <AppContext.Provider value={{
      auth, lang, theme, toggleTheme, setLang: setLangWithStorage, setUser, logout, updateUser, t,
      selectedMovie, setSelectedMovie, autoPlayTrailer, systemKey, setSystemKey, omdbKey, setOmdbKey
    }}>
      <HashRouter>
        <div className="min-h-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-500 bg-black text-white">
          {auth.isAuthenticated && <Sidebar />}
          <main className={`flex-1 overflow-y-auto pb-20 md:pb-0 relative scroll-smooth no-scrollbar ${auth.isAuthenticated ? 'md:ml-64' : ''}`}>
            {/* Block rendering until auth is loaded to prevent premature redirects */}
            {!authLoaded ? (
              <div className="flex-1 flex items-center justify-center min-h-screen bg-black">
                <div className="w-10 h-10 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={!auth.isAuthenticated ? <LandingPage /> : <Navigate to="/" replace />} />
                  <Route path="/anime-world" element={<AnimePage />} />
                  <Route path="/short-films" element={<ShortFilmsPage />} />
                  <Route path="/series" element={<SeriesPage />} />
                  <Route path="/language/:langCode" element={<LanguagePage />} />
                  <Route path="/signed-out" element={<LogoutSuccess />} />

                  {/* Protected Routes */}
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/moods" element={<RequireAuth><MoodPage /></RequireAuth>} />
                  <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                  <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={<RequireAuth>{auth.user?.role === UserRole.ADMIN ? <AdminPage /> : <Navigate to="/" replace />}</RequireAuth>}
                  />
                  <Route
                    path="/admin/chatbot"
                    element={<RequireAuth>{auth.user?.role === UserRole.ADMIN ? <AdminChatbotPage /> : <Navigate to="/" replace />}</RequireAuth>}
                  />

                  {/* Always redirect unknown routes to HomePage */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <MovieDetailModal />
              </>
            )}
            <footer className="mt-10 border-t px-6 md:px-12 py-8 border-white/10 bg-black/40 text-white">
              <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-2">About</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    ChalaChitra is your intelligent movie companion for discovering, exploring, and enjoying films across languages and moods.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-2">Contact</h3>
                  <p className={`text-sm ${theme === Theme.DARK ? 'text-white/70' : 'text-slate-600'}`}>
                    <a href="tel:876570000" className="hover:underline">876570000</a>
                    <span className="px-2">|</span>
                    <a href="tel:7896050000" className="hover:underline">7896050000</a>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-2">Email</h3>
                  <p className={`text-sm ${theme === Theme.DARK ? 'text-white/70' : 'text-slate-600'}`}>
                    <a href="mailto:abhilash@gmail.com" className="hover:underline">abhilash@gmail.com</a>
                  </p>
                </div>
              </div>
            </footer>
          </main>
          {auth.isAuthenticated && <MobileNav />}
          {auth.isAuthenticated && <ChatbotButton />}
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

const Sidebar = () => {
  const { logout, auth, t, lang, setLang, theme, toggleTheme } = useApp();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const languages = [
    { code: Language.EN, label: 'English', native: 'English' },
    { code: Language.KN, label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: Language.HI, label: 'Hindi', native: 'हिन्दी' },
    { code: Language.TE, label: 'Telugu', native: 'తెలుగు' },
    { code: Language.TA, label: 'Tamil', native: 'தமிழ்' },
    { code: Language.ML, label: 'Malayalam', native: 'മലയാളം' },
    { code: Language.BN, label: 'Bengali', native: 'বাংলা' },
    { code: Language.MR, label: 'Marathi', native: 'मರಾಠಿ' },
    { code: Language.JA, label: 'Japanese', native: '日本語' },
    { code: Language.KO, label: 'Korean', native: '한국어' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r fixed top-0 left-0 h-screen p-6 transition-all duration-300 z-40 bg-zinc-950 border-white/10">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center font-black text-black text-xl shadow-[0_8px_20px_rgba(234,179,8,0.3)]">CM</div>
        <h1 className="text-xl font-black tracking-tight uppercase text-white">ChalaChitra</h1>
      </div>

      <nav className="space-y-1.5 flex-1">
        <SidebarLink to="/anime-world" icon={<Sparkles size={20} />} label="Anime World" />
        <SidebarLink to="/search" icon={<Search size={20} />} label={t('searchPlaceholder').split('...')[0]} />
        <SidebarLink to="/moods" icon={<Film size={20} />} label={t('moods')} />
        <SidebarLink to="/chat" icon={<MessageCircle size={20} />} label={t('chatAssistant')} />
        <SidebarLink to="/settings" icon={<Settings size={20} />} label={t('settings')} />
        {auth.user?.role === UserRole.ADMIN && (
          <SidebarLink to="/admin" icon={<LayoutDashboard size={20} />} label={t('adminDashboard')} />
        )}
      </nav>

      <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
        <div className="px-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm bg-white/5 hover:bg-white/10 text-white"
          >
            {theme === Theme.DARK ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-indigo-600" />}
            <span>{theme === Theme.DARK ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div className="px-2 relative">
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm bg-black text-white border border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-indigo-500" />
              <span>{languages.find(l => l.code === lang)?.native}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 ${showLangPicker ? 'rotate-180' : ''}`} />
          </button>

          {showLangPicker && (
            <div className="absolute bottom-full left-2 right-2 mb-2 p-2 rounded-2xl border shadow-2xl z-[100] grid grid-cols-2 gap-1 animate-in slide-in-from-bottom-2 bg-black border-white/10">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black text-center transition-all ${lang === l.code ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                >
                  {l.native}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 text-red-500 hover:text-red-400 transition w-full px-4 py-2 mt-2 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-black text-xs uppercase tracking-widest">{t('logout')}</span>
        </button>
      </div>

    </aside>
  );
};

const SidebarLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group hover:bg-white/5 text-zinc-400 hover:text-white">
      <span className="transition-all group-hover:text-red-500 group-hover:scale-110">{icon}</span>
      <span className="font-bold text-sm text-inherit">{label}</span>
    </Link>
  );
};

const MobileNav = () => {
  const { auth, t, theme, toggleTheme, lang, setLang } = useApp();
  const [showPicker, setShowPicker] = useState(false);

  const languages = [
    { code: Language.EN, native: 'EN' },
    { code: Language.KN, native: 'KN' },
    { code: Language.HI, native: 'HI' },
    { code: Language.TE, native: 'TE' },
    { code: Language.TA, native: 'TA' },
    { code: Language.ML, native: 'ML' },
    { code: Language.BN, native: 'BN' },
    { code: Language.MR, native: 'MR' },
    { code: Language.JA, native: 'JA' },
    { code: Language.KO, native: 'KO' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t flex justify-around py-4 z-50 transition-all bg-black/90 border-white/10 text-zinc-500">
      <Link to="/anime-world" className="flex flex-col items-center gap-1 hover:text-indigo-600"><Sparkles size={22} /><span className="text-[9px] font-bold">Anime</span></Link>
      <Link to="/search" className="flex flex-col items-center gap-1 hover:text-indigo-600"><Search size={22} /><span className="text-[9px] font-bold">Search</span></Link>

      <div className="relative">
        <button onClick={() => setShowPicker(!showPicker)} className="flex flex-col items-center gap-1 hover:text-indigo-600">
          <Globe size={22} className="text-indigo-500" />
          <span className="text-[9px] font-bold">{lang.toUpperCase()}</span>
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-2 rounded-2xl border shadow-2xl z-[100] grid grid-cols-3 gap-2 w-48 bg-black border-white/10">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setShowPicker(false); }}
                className={`py-2 text-[10px] font-black rounded-lg ${lang === l.code ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {l.native}
              </button>
            ))}
          </div>
        )}
      </div>

      <Link to="/chat" className="flex flex-col items-center gap-1 hover:text-indigo-600"><MessageCircle size={22} /><span className="text-[9px] font-bold">Chat</span></Link>
      <Link to="/settings" className="flex flex-col items-center gap-1 hover:text-indigo-600"><Settings size={22} /><span className="text-[9px] font-bold">Settings</span></Link>
    </nav>
  );
};

const ChatbotButton = () => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    DB.settings.get('chatbot_enabled').then(val => setChatbotEnabled(val !== 'false'));
  }, []);

  if (!chatbotEnabled) return null;

  return (
    <>
      {!showChatbot && (
        <div className="fixed right-6 bottom-24 md:bottom-8 z-50">
          <button
            onClick={() => setShowChatbot(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all bg-gradient-to-br from-indigo-600 to-purple-600 hover:scale-110 text-white shadow-indigo-500/30"
          >
            <Bot size={24} />
          </button>
        </div>
      )}
      {showChatbot && (
        <div className="fixed bottom-0 right-0 z-[70] w-full md:w-[480px] md:bottom-8 md:right-8 md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 md:rounded-3xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot size={20} className="text-white" />
                <span className="font-semibold text-white">ChalaChitra Assistant</span>
              </div>
              <button 
                onClick={() => setShowChatbot(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-900">
              <p className="text-slate-400 text-sm mb-3">How can I help you today?</p>
              <div className="space-y-2">
                <button 
                  onClick={() => { navigate('/search'); setShowChatbot(false); }}
                  className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
                >
                  Search for movies
                </button>
                <button 
                  onClick={() => { navigate('/mood'); setShowChatbot(false); }}
                  className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
                >
                  Find movies by mood
                </button>
                <button 
                  onClick={() => { navigate('/discover'); setShowChatbot(false); }}
                  className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
                >
                  Discover trending movies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
