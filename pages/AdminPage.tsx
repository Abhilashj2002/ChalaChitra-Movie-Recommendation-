import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SimpleDB as DB } from '../services/simpleDb';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Activity, FileUp, Download, Key, CheckCircle, RefreshCcw, MessageSquareDot, Layout, Save, ToggleLeft, ToggleRight, X, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User, SiteFeedback, ChatbotFeedback } from '../types';

// Dummy chatbot data for demonstration
const initialChatbotData = [
  { id: 1, question: 'What is ChalaChitra?', answer: 'ChalaChitra is your intelligent movie companion.' },
  { id: 2, question: 'How do I use the chatbot?', answer: 'Just type your question and get instant movie advice!' }
];

// Colors for genre pie chart
const GENRE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c'];

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

const ensureReadableThemeText = (background: string, text: string, isLightMode: boolean) => {
  const bgLuminance = getColorLuminance(background);
  const textLuminance = getColorLuminance(text);

  if (bgLuminance === null || textLuminance === null) return text;

  const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) / (Math.min(bgLuminance, textLuminance) + 0.05);
  if (contrast >= 4.5) return text;

  return isLightMode ? '#0f172a' : '#ffffff';
};

const AdminPage: React.FC = () => {
  const { auth, updateUser, systemKey, setSystemKey, theme, toggleTheme } = useApp();
  const isLightMode = theme === 'light';
  
  const [users, setUsers] = useState<User[]>([]);
  const [siteFeedbackList, setSiteFeedbackList] = useState<SiteFeedback[]>([]);
  
  // Chatbot controls state
  const [chatbotData, setChatbotData] = useState(initialChatbotData);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotSaved, setChatbotSaved] = useState(false);
  const [chatbotShowTrending, setChatbotShowTrending] = useState(true);
  const [chatbotShowRecommendations, setChatbotShowRecommendations] = useState(true);
  const [chatbotShowActorDetails, setChatbotShowActorDetails] = useState(true);
  
  // Theme controls
  const [themeColor, setThemeColor] = useState('#ef4444');
  const [themeBackground, setThemeBackground] = useState('#000000');
  const [themeText, setThemeText] = useState('#ffffff');
  const [themeSaved, setThemeSaved] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('default');
  
  const THEME_PRESETS = [
    { 
      id: 'default', 
      name: 'Default Dark', 
      primary: '#ef4444', 
      background: '#000000',
      text: '#ffffff',
      gradient: 'from-red-600 to-red-900'
    },
    { 
      id: 'ocean', 
      name: 'Ocean Blue', 
      primary: '#3b82f6', 
      background: '#0c1929',
      text: '#e0f2fe',
      gradient: 'from-blue-600 to-blue-900'
    },
    { 
      id: 'forest', 
      name: 'Forest Green', 
      primary: '#22c55e', 
      background: '#052e16',
      text: '#dcfce7',
      gradient: 'from-green-600 to-green-900'
    },
    { 
      id: 'sunset', 
      name: 'Sunset Orange', 
      primary: '#f97316', 
      background: '#1c1917',
      text: '#ffedd5',
      gradient: 'from-orange-600 to-orange-900'
    },
    { 
      id: 'royal', 
      name: 'Royal Purple', 
      primary: '#a855f7', 
      background: '#0f0a1f',
      text: '#f3e8ff',
      gradient: 'from-purple-600 to-purple-900'
    },
    { 
      id: 'midnight', 
      name: 'Midnight', 
      primary: '#6366f1', 
      background: '#020617',
      text: '#e0e7ff',
      gradient: 'from-indigo-600 to-indigo-900'
    },
    { 
      id: 'rose', 
      name: 'Rose Pink', 
      primary: '#ec4899', 
      background: '#1a0a14',
      text: '#fce7f3',
      gradient: 'from-pink-600 to-pink-900'
    },
    { 
      id: 'gold', 
      name: 'Gold Luxury', 
      primary: '#eab308', 
      background: '#1a1a0a',
      text: '#fef08a',
      gradient: 'from-yellow-600 to-yellow-900'
    },
  ];
  
  // Feedback controls
  const [chatbotFeedbackEnabled, setChatbotFeedbackEnabled] = useState(true);
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, average: 0, registeredTotal: 0, guestTotal: 0 });
  const [allChatbotFeedbacks, setAllChatbotFeedbacks] = useState<ChatbotFeedback[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [popularMoviesData, setPopularMoviesData] = useState<any[]>([]);
  
  // Analytics state
  const [visitStats, setVisitStats] = useState<any>({ monthly: [], userTypeStats: [], yearly: [] });
  const [genreStats, setGenreStats] = useState<any>({ monthly: [], overall: [], byUserType: [] });
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const handleAddQA = () => {
    if (newQ.trim() && newA.trim()) {
      setChatbotData([...chatbotData, { id: Date.now(), question: newQ, answer: newA }]);
      setNewQ('');
      setNewA('');
    }
  };
  const handleEditQA = (id: number, field: 'question' | 'answer', value: string) => {
    setChatbotData(chatbotData.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const handleDeleteQA = (id: number) => {
    setChatbotData(chatbotData.filter(item => item.id !== id));
  };
  const [apiKey, setApiKey] = useState(systemKey || '');
  const [saved, setSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tmdbApiKey, setTmdbApiKey] = useState('');

  // Homepage UI state
  const [hpFeedback, setHpFeedback] = useState(true);
  const [hpHeroSlider, setHpHeroSlider] = useState(true);
  const [hpFilters, setHpFilters] = useState(true);
  const [hpSaved, setHpSaved] = useState(false);

  useEffect(() => {
    DB.users.getAll().then(setUsers);
    DB.siteFeedback.getAll().then(setSiteFeedbackList);
    DB.feedback.getAll().then(feedbacks => {
      setAllChatbotFeedbacks(feedbacks);
      if (feedbacks.length > 0) {
        const total = feedbacks.length;
        const average = feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / total;
        const registeredTotal = feedbacks.filter(f => f.userId).length;
        const guestTotal = total - registeredTotal;
        setFeedbackStats({ total, average, registeredTotal, guestTotal });
      }
    });
    
    // Load TMDB API key from DB on mount
    DB.settings.get('tmdb_api_key').then((key) => {
      if (key) {
        setApiKey(key);
        setTmdbApiKey(key);
        setSystemKey(key);
      } else {
        const envKey = ((import.meta as any).env?.VITE_TMDB_API_KEY || '').trim();
        if (envKey) {
          setApiKey(envKey);
          setTmdbApiKey(envKey);
          setSystemKey(envKey);
          DB.settings.set('tmdb_api_key', envKey);
        }
      }
    });
    
    DB.settings.get('chatbot_feedback_enabled').then(val => setChatbotFeedbackEnabled(val !== 'false'));
    
    // Load HP settings
    DB.settings.get('hp_feedback_enabled').then(val => setHpFeedback(val !== 'false'));
    DB.settings.get('hp_hero_slider_enabled').then(val => setHpHeroSlider(val !== 'false'));
    DB.settings.get('hp_filters_enabled').then(val => setHpFilters(val !== 'false'));
    
    // Load chatbot settings
    DB.settings.get('chatbot_enabled').then(val => setChatbotEnabled(val !== 'false'));
    DB.settings.get('chatbot_show_trending').then(val => setChatbotShowTrending(val !== 'false'));
    DB.settings.get('chatbot_show_recommendations').then(val => setChatbotShowRecommendations(val !== 'false'));
    DB.settings.get('chatbot_show_actor_details').then(val => setChatbotShowActorDetails(val !== 'false'));
    
    // Load theme settings
    DB.settings.get('theme_color').then(val => val && setThemeColor(val));
    DB.settings.get('theme_background').then(val => val && setThemeBackground(val));
    DB.settings.get('theme_text').then(val => val && setThemeText(val));
    DB.settings.get('theme_preset').then(val => val && setSelectedPreset(val));
    DB.settings.get('light_mode').then(val => {
      const light = val === 'true';
      if (light) {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    });
    
    // Fetch analytics data
    fetchAnalytics();
  }, [analyticsYear]);
  
  // Fetch analytics data from API
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const API_BASE = 'http://localhost:3002/api';
      
      // Fetch visit stats
      const visitResponse = await fetch(`${API_BASE}/analytics/visits?year=${analyticsYear}`);
      if (visitResponse.ok) {
        const visitData = await visitResponse.json();
        setVisitStats({
          monthly: visitData.monthly || [],
          userTypeStats: visitData.userTypeStats || [],
          yearly: visitData.yearly || []
        });
      }
      
      // Fetch genre stats
      const genreResponse = await fetch(`${API_BASE}/analytics/genres?year=${analyticsYear}`);
      if (genreResponse.ok) {
        const genreData = await genreResponse.json();
        setGenreStats({
          monthly: genreData.monthly || [],
          overall: genreData.overall || [],
          byUserType: genreData.byUserType || []
        });
      }

      // Fetch activity logs
      const activityResponse = await fetch(`${API_BASE}/analytics/activity`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLogs(activityData);
      }

      // Fetch popular movies
      const popMoviesResponse = await fetch(`${API_BASE}/analytics/popular-movies`);
      if (popMoviesResponse.ok) {
        const popMoviesData = await popMoviesResponse.json();
        setPopularMoviesData(popMoviesData);
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setAnalyticsLoading(false);
    }
  };
  
  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setThemeColor(preset.primary);
      setThemeBackground(preset.background);
      setThemeText(preset.text || '#ffffff');
      setSelectedPreset(presetId);
    }
  };
  
  // Removed local toggleLightMode - now using global toggleTheme from useApp()

  // Helper function to process monthly visit data for charts
  const getMonthlyVisitData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // For current year, show only till current month. For past years, show all months.
    const maxMonth = analyticsYear === currentYear ? currentMonth : 12;
    
    const data = months.slice(0, maxMonth).map((name, index) => {
      const monthNum = index + 1;
      const guestVisits = (visitStats.monthly || [])
        .filter((m: any) => m.month === monthNum && m.user_type === 'guest')
        .reduce((sum: number, m: any) => sum + m.count, 0);
      const registeredVisits = (visitStats.monthly || [])
        .filter((m: any) => m.month === monthNum && m.user_type === 'registered')
        .reduce((sum: number, m: any) => sum + m.count, 0);
      return { name, guest: guestVisits, registered: registeredVisits, total: guestVisits + registeredVisits };
    });
    return data;
  };

  // Helper function to get top genres data (year-to-date for current year)
  const getTopGenresData = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Filter genre stats by year (API already filters, but double-check)
    let filteredStats = (genreStats.overall || []);
    
    return filteredStats.slice(0, 8).map((g: any) => ({
      name: g.genre_name,
      score: g.total_score,
      interactions: g.total_interactions
    }));
  };

  // Helper function to get languages data from user preferences
  const getLanguagesData = () => {
    const languageNames: Record<string, string> = {
      en: 'English', hi: 'Hindi', kn: 'Kannada', te: 'Telugu',
      ta: 'Tamil', ml: 'Malayalam', bn: 'Bengali', mr: 'Marathi',
      ja: 'Japanese', ko: 'Korean'
    };
    
    const languageColors: Record<string, string> = {
      en: '#3b82f6', hi: '#f97316', kn: '#22c55e', te: '#ef4444',
      ta: '#8b5cf6', ml: '#06b6d4', bn: '#ec4899', mr: '#f59e0b',
      ja: '#f43f5e', ko: '#6366f1'
    };

    // Count language preferences from users
    const langCounts: Record<string, number> = {};
    users.forEach((user: any) => {
      const langs = user.preferences?.languages || [];
      langs.forEach((lang: string) => {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });
    });

    // Convert to chart data format
    return Object.entries(langCounts)
      .map(([code, count]) => ({
        name: languageNames[code] || code,
        value: count,
        color: languageColors[code] || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // Helper function to get most popular movies data
  const getPopularMoviesData = () => {
    return popularMoviesData.length > 0 ? popularMoviesData : [
      { id: 1, title: 'KGF Chapter 2', views: 245, searches: 189, rating: 8.4, language: 'Kannada' },
      { id: 2, title: 'RRR', views: 312, searches: 234, rating: 8.2, language: 'Telugu' },
      { id: 3, title: 'Kantara', views: 198, searches: 156, rating: 8.5, language: 'Kannada' },
      { id: 4, title: 'Pushpa', views: 267, searches: 198, rating: 7.6, language: 'Telugu' },
      { id: 5, title: 'Vikram', views: 223, searches: 167, rating: 8.3, language: 'Tamil' },
    ];
  };

  const handleSaveToken = async () => {
    setIsUpdating(true);
    try {
      await DB.settings.set('tmdb_api_key', apiKey);
      setSystemKey(apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to update global API key", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTmdbApiKey(e.target.value);
  };

  const saveApiKey = async () => {
    setIsUpdating(true);
    try {
      await DB.settings.set('tmdb_api_key', tmdbApiKey);
      setSystemKey(tmdbApiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to update global API key", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveHpSettings = async () => {
    try {
      await Promise.all([
        DB.settings.set('hp_feedback_enabled', String(hpFeedback)),
        DB.settings.set('hp_hero_slider_enabled', String(hpHeroSlider)),
        DB.settings.set('hp_filters_enabled', String(hpFilters))
      ]);
      setHpSaved(true);
      setTimeout(() => setHpSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save homepage settings", e);
    }
  };

  const handleSaveChatbotSettings = async () => {
    try {
      await Promise.all([
        DB.settings.set('chatbot_enabled', String(chatbotEnabled)),
        DB.settings.set('chatbot_show_trending', String(chatbotShowTrending)),
        DB.settings.set('chatbot_show_recommendations', String(chatbotShowRecommendations)),
        DB.settings.set('chatbot_show_actor_details', String(chatbotShowActorDetails))
      ]);
      setChatbotSaved(true);
      setTimeout(() => setChatbotSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save chatbot settings", e);
    }
  };

  const handleSaveThemeSettings = async () => {
    try {
      let finalThemeBg = themeBackground;
      
      if (isLightMode) {
        if (themeBackground === '#050505' || themeBackground === '#000000') finalThemeBg = '#ffffff';
      }
      const finalThemeText = ensureReadableThemeText(finalThemeBg, themeText, isLightMode);

      await Promise.all([
        DB.settings.set('theme_color', themeColor),
        DB.settings.set('theme_background', finalThemeBg),
        DB.settings.set('theme_text', finalThemeText),
        DB.settings.set('theme_preset', selectedPreset),
        DB.settings.set('light_mode', String(isLightMode))
      ]);
      
      // Apply light/dark mode
      const themeClass = isLightMode ? 'light' : 'dark';
      document.documentElement.className = themeClass;
      localStorage.setItem('cm_theme', themeClass);

      // Apply theme colors directly
      document.documentElement.style.setProperty('--theme-primary', themeColor);
      document.documentElement.style.setProperty('--theme-background', finalThemeBg);
      document.documentElement.style.setProperty('--theme-text', finalThemeText);
      
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 3000);
      
      // Update state if we normalized colors
      if (finalThemeText !== themeText) setThemeText(finalThemeText);
      if (finalThemeBg !== themeBackground) setThemeBackground(finalThemeBg);
    } catch (e) {
      console.error("Failed to save theme settings", e);
    }
  };

  const handleSaveFeedbackSettings = async () => {
    try {
      await DB.settings.set('chatbot_feedback_enabled', String(chatbotFeedbackEnabled));
      setChatbotSaved(true);
      setTimeout(() => setChatbotSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save feedback settings", e);
    }
  };

  const handleDeleteSiteFeedback = async (id: string) => {
    if (confirm("Are you sure you want to delete this feedback?")) {
      await DB.siteFeedback.delete(id);
      const updated = await DB.siteFeedback.getAll();
      setSiteFeedbackList(updated);
    }
  };

  // Only show API key section to admins
  const isAdmin = auth?.user?.role === 'ADMIN';


  // Placeholder for analytics ingestion
  const handleIngestAnalytics = () => {
    alert('Analytics ingestion coming soon');
  };

  // Export users as CSV
  const handleExportRecords = () => {
    if (!users || users.length === 0) {
      alert('No user records to export.');
      return;
    }
    // Only export non-sensitive fields
    const exportFields = ['username', 'email', 'role', 'priorityLanguage'];
    const header = exportFields.join(',');
    const rows = users.map(user => {
      const priorityLanguage = user.preferences?.priorityLanguage || '';
      return [user.username, user.email, user.role, priorityLanguage].map(val => {
        if (typeof val === 'string' && val.includes(',')) {
          return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',');
    });
    const csvContent = [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">System Console</h1>
          <p className="text-sm font-medium uppercase tracking-widest mt-1" style={{ color: 'color-mix(in srgb, var(--theme-text) 40%, transparent)' }}>Administrative Oversight</p>
        </div>
        <button
          className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          onClick={handleExportRecords}
        >
          <Download size={16} /> Export Records
        </button>
      </div>

      {/* Chatbot Editor Section Link */}
      <div className="glass-panel p-8 rounded-3xl border border-yellow-500/30 mb-12 flex items-center gap-6">
        <MessageSquareDot size={32} className="text-yellow-500" />
        <div className="flex-1">
          <h2 className="text-xl font-black uppercase tracking-widest mb-1" style={{ color: 'var(--theme-primary)' }}>Chatbot Q&A Editor</h2>
          <p className="text-sm text-yellow-900/70">Manage and edit chatbot questions and answers for your users.</p>
        </div>
        <Link to="/admin/chatbot" className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all">Go to Editor</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Chatbot Controls Panel */}
        <div className="glass-panel p-10 rounded-[2.5rem] border border-yellow-500/30 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-yellow-500">Chatbot Controls</h2>
            <button
              onClick={handleSaveChatbotSettings}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              <Save size={14} /> Save All Settings
            </button>
          </div>
          
          {chatbotSaved && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle size={14} /> All chatbot settings saved successfully!
            </div>
          )}
          
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs font-bold text-yellow-500 mb-2">Status: {chatbotEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
            <p className="text-[10px] text-yellow-500/70">When disabled, users will see a maintenance message instead of the chatbot.</p>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${chatbotShowTrending ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div>
                <p className="text-sm font-bold">Show Trending Movies</p>
                <p className="text-[10px] text-white/60">Display trending on chat open</p>
              </div>
              <button
                onClick={() => setChatbotShowTrending(!chatbotShowTrending)}
                className={`w-12 h-6 rounded-full transition-all relative ${chatbotShowTrending ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${chatbotShowTrending ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${chatbotShowRecommendations ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div>
                <p className="text-sm font-bold">Movie Recommendations</p>
                <p className="text-[10px] text-white/60">AI suggests similar movies</p>
              </div>
              <button
                onClick={() => setChatbotShowRecommendations(!chatbotShowRecommendations)}
                className={`w-12 h-6 rounded-full transition-all relative ${chatbotShowRecommendations ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${chatbotShowRecommendations ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${chatbotShowActorDetails ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div>
                <p className="text-sm font-bold">Actor Details & Images</p>
                <p className="text-[10px] text-white/60">Show cast with photos</p>
              </div>
              <button
                onClick={() => setChatbotShowActorDetails(!chatbotShowActorDetails)}
                className={`w-12 h-6 rounded-full transition-all relative ${chatbotShowActorDetails ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${chatbotShowActorDetails ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${chatbotEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div>
                <p className="text-sm font-bold">Enable Chatbot</p>
                <p className="text-[10px] text-white/60">Master toggle</p>
              </div>
              <button
                onClick={() => setChatbotEnabled(!chatbotEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${chatbotEnabled ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${chatbotEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest">Add Training Q&A</h3>
            <div className="flex gap-3 mb-3">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Question (e.g., 'What are the best action movies?')"
                value={newQ}
                onChange={e => setNewQ(e.target.value)}
              />
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Answer (e.g., 'Check out our Action category for top-rated films!')"
                value={newA}
                onChange={e => setNewA(e.target.value)}
              />
              <button className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all" onClick={handleAddQA}>Add</button>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Training Data ({chatbotData.length} entries)</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {chatbotData.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-yellow-500 mb-1">Q: {item.question}</p>
                      <p className="text-xs text-white/70">A: {item.answer}</p>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-400 p-2"
                      onClick={() => handleDeleteQA(item.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Controls Panel */}
        <div className="glass-panel p-10 rounded-[2.5rem] border border-blue-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-blue-500">🎨 Theme & Interface</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLightMode ? 'bg-zinc-200 text-black' : 'bg-zinc-900 text-white'}`}
              >
                {isLightMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button
                onClick={handleSaveThemeSettings}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
              >
                <Save size={14} /> Save Theme
              </button>
            </div>
          </div>
          
          {themeSaved && (
            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle size={14} /> Theme settings saved successfully!
            </div>
          )}

          {/* Theme Presets */}
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 mb-4">🎭 Quick Theme Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`relative overflow-hidden rounded-xl p-4 border-2 transition-all hover:scale-105 ${selectedPreset === preset.id ? 'border-blue-500 shadow-lg shadow-blue-500/30' : 'border-white/10'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient} opacity-20`}></div>
                  <div className="relative z-10">
                    <div className="flex gap-2 mb-2">
                      <div style={{ backgroundColor: preset.primary }} className="w-6 h-6 rounded-full border border-white/20"></div>
                      <div style={{ backgroundColor: preset.background }} className="w-6 h-6 rounded-full border border-white/20"></div>
                    </div>
                    <p className="text-xs font-bold">{preset.name}</p>
                    {selectedPreset === preset.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-blue-500">🎨 Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-16 h-12 rounded-lg border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#ef4444"
                />
              </div>
              <p className="text-[10px] text-white/60 mt-2">Used for buttons, highlights, and accents</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-blue-500">🌑 Background Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeBackground}
                  onChange={(e) => setThemeBackground(e.target.value)}
                  className="w-16 h-12 rounded-lg border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeBackground}
                  onChange={(e) => setThemeBackground(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#050505"
                />
              </div>
              <p className="text-[10px] text-white/60 mt-2">Main background color for the homepage</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-blue-500">📝 Text Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeText}
                  onChange={(e) => setThemeText(e.target.value)}
                  className="w-16 h-12 rounded-lg border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeText}
                  onChange={(e) => setThemeText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#ffffff"
                />
              </div>
              <p className="text-[10px] text-white/60 mt-2">Primary text typography color</p>
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <p className="text-xs font-bold text-blue-500 mb-4">👁️ Live Preview</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div style={{ backgroundColor: themeBackground, color: themeText }} className="p-4 rounded-xl border border-white/10">
                <p className="text-[10px] mb-2" style={{ color: themeText, opacity: 0.6 }}>Background</p>
                <div className="h-16 rounded-lg flex items-center justify-center">
                  <span className="text-xs" style={{ color: themeText, opacity: 0.8 }}>Main BG</span>
                </div>
              </div>
              <div style={{ backgroundColor: themeColor }} className="p-4 rounded-xl border border-white/10">
                <p className="text-[10px] text-white/60 mb-2">Primary Color</p>
                <div className="h-16 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white/90 font-bold">Accent</span>
                </div>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-br ${THEME_PRESETS.find(p => p.id === selectedPreset)?.gradient || 'from-red-600 to-red-900'}`}>
                <p className="text-[10px] text-white/60 mb-2">Gradient</p>
                <div className="h-16 rounded-lg flex items-center justify-center bg-black/20">
                  <span className="text-xs text-white font-bold">Hero</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Controls Panel */}
        <div className="glass-panel p-10 rounded-[2.5rem] border border-pink-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-pink-500">Feedback Controls</h2>
            <button
              onClick={handleSaveFeedbackSettings}
              className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 transition-all"
            >
              <Save size={14} /> Save Settings
            </button>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <p className="text-xs font-bold text-pink-500 mb-2">Status: {chatbotFeedbackEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
            <p className="text-[10px] text-pink-500/70">When enabled, users will see rating stars after chatbot responses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${chatbotFeedbackEnabled ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/10'}`}>
              <div>
                <p className="text-sm font-bold">Enable Feedback</p>
                <p className="text-[10px] text-white/60">Show rating stars after results</p>
              </div>
              <button
                onClick={() => setChatbotFeedbackEnabled(!chatbotFeedbackEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${chatbotFeedbackEnabled ? 'bg-pink-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${chatbotFeedbackEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <p className="text-sm font-bold mb-2">Feedback Statistics</p>
              <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex-1">
                  <p className="text-[10px] text-white/60">Total Ratings</p>
                  <p className="text-2xl font-black text-pink-500">{feedbackStats.total}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60">Average Rating</p>
                  <div className="flex items-center gap-1">
                    <Star size={20} className="text-yellow-500 fill-yellow-500" />
                    <p className="text-2xl font-black text-yellow-500">{feedbackStats.average.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                 <div>
                    <span className="text-white/40 block mb-1">Registered Users</span>
                    <span className="font-bold text-pink-500 bg-pink-500/10 px-2 py-1 rounded">{feedbackStats.registeredTotal}</span>
                 </div>
                 <div className="text-right">
                    <span className="text-white/40 block mb-1">Guest Users</span>
                    <span className="font-bold text-slate-400 bg-slate-500/10 px-2 py-1 rounded">{feedbackStats.guestTotal}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Chatbot Feedback Log</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {allChatbotFeedbacks.map(f => (
                <div key={f.id} className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-pink-500">{f.emoji} Rating: {f.rating}/5</span>
                    <span className="opacity-40">{new Date(f.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="opacity-60 italic">Message ID: {(f.messageId || f.id || 'unknown').substring(0, 8)}...</p>
                  {f.userId && <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">User ID: {f.userId}</p>}
                </div>
              ))}
              {allChatbotFeedbacks.length === 0 && (
                <div className="text-center py-8 opacity-40 italic">No chatbot feedback yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">


        <section className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-14 h-14 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
              <Key size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Content Synchronization</h2>
              <p className="text-sm text-white/40 font-medium">Global Library Protocol Management</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Master Library Access Token</label>
              <div className="flex gap-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-mono"
                  placeholder="Enter secure synchronization token..."
                />
                <button
                  onClick={handleSaveToken}
                  disabled={isUpdating}
                  className="bg-yellow-500 text-black font-black uppercase tracking-widest text-xs px-8 rounded-2xl hover:bg-yellow-400 transition-all flex items-center gap-3 shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  {isUpdating ? <RefreshCcw size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <RefreshCcw size={18} />}
                  <span>{saved ? 'Applied' : 'Sync Global'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <Layout size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">UI Layout Protocol</h2>
              <p className="text-sm text-white/40 font-medium">Homepage Visibility & Controls</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Feedback Carousel</p>
                <p className="text-[10px] text-white/40">Toggle user review visibility on homepage</p>
              </div>
              <button
                onClick={() => setHpFeedback(!hpFeedback)}
                className={`p-2 rounded-xl transition-all ${hpFeedback ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/20'}`}
              >
                {hpFeedback ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Hero Slider</p>
                <p className="text-[10px] text-white/40">Enable/Disable trending items below hero</p>
              </div>
              <button
                onClick={() => setHpHeroSlider(!hpHeroSlider)}
                className={`p-2 rounded-xl transition-all ${hpHeroSlider ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/20'}`}
              >
                {hpHeroSlider ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Quick Filters</p>
                <p className="text-[10px] text-white/40">Toggle genre & language controls</p>
              </div>
              <button
                onClick={() => setHpFilters(!hpFilters)}
                className={`p-2 rounded-xl transition-all ${hpFilters ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/20'}`}
              >
                {hpFilters ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>

            <button
              onClick={handleSaveHpSettings}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${hpSaved ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'}`}
            >
              {hpSaved ? <CheckCircle size={18} /> : <Save size={18} />}
              <span>{hpSaved ? 'Settings Saved' : 'Apply UI Changes'}</span>
            </button>
          </div>
        </section>
      </div>

      <div className="rounded-[2.5rem] border border-white/10 overflow-hidden mb-12 bg-black">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-widest" style={{ color: 'var(--theme-primary)' }}>Site Feedback Responses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-zinc-500 border-b border-white/10">
                <th className="p-6 font-bold uppercase tracking-widest text-[10px]">Date</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px]">Name</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px]">Message</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {siteFeedbackList.map((item, i) => (
                <tr key={item.id} className="transition-all border-b border-white/5">
                  <td className="p-6 font-mono text-xs">{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</td>
                  <td className="p-6">
                    <p className="font-bold">{item.name}</p>
                    {item.userId && <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Registered User</p>}
                    {item.rating ? (
                       <div className="flex items-center gap-1 mt-1">
                         {[...Array(5)].map((_, idx) => (
                           <Star key={idx} size={10} className={idx < item.rating! ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"} />
                         ))}
                       </div>
                    ) : null}
                  </td>
                  <td className="p-6 text-xs max-w-sm"><p className="line-clamp-2">{item.message}</p></td>
                  <td className="p-6 text-right">
                    <button onClick={() => handleDeleteSiteFeedback(item.id)} className="text-red-500 hover:text-red-400 font-bold uppercase tracking-widest text-[10px]">Delete</button>
                  </td>
                </tr>
              ))}
              {siteFeedbackList.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-xs opacity-50 font-bold uppercase tracking-widest">No feedback received yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Dashboard Section */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <Activity size={24} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-500">Analytics Dashboard</h2>
              <p className="text-sm text-white/40 font-medium">Visitor Statistics & Genre Preferences</p>
            </div>
          </div>
<select
              value={analyticsYear}
              onChange={(e) => setAnalyticsYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
        </div>

        {analyticsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Total Visits</p>
                <p className="text-3xl font-black text-indigo-400">
                  {(visitStats.userTypeStats || []).reduce((sum: number, s: any) => sum + s.count, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Registered Users</p>
                <p className="text-3xl font-black text-emerald-400">
                  {(visitStats.userTypeStats || []).find((s: any) => s.user_type === 'registered')?.unique_users || 0}
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Guest Visits</p>
                <p className="text-3xl font-black text-amber-400">
                  {(visitStats.userTypeStats || []).find((s: any) => s.user_type === 'guest')?.count || 0}
                </p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Top Genre</p>
                <p className="text-2xl font-black text-pink-400">
                  {(genreStats.overall || [])[0]?.genre_name || 'N/A'}
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Monthly Visits Chart */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white/60">
                  Monthly Visits (Guest vs Registered) {analyticsYear === new Date().getFullYear() ? '- Year to Date' : ''}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMonthlyVisitData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="guest" fill="#f59e0b" name="Guest" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="registered" fill="#10b981" name="Registered" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Genre Popularity Pie Chart */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white/60">Top Genre Preferences</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTopGenresData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="score"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {getTopGenresData().map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [`Score: ${value}`, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Languages and Popular Movies Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Languages Pie Chart */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white/60">Popular Languages</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getLanguagesData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {getLanguagesData().map((entry: any, index: number) => (
                          <Cell key={`lang-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [`Users: ${value}`, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Most Watched/Searched Movies */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-white/60">Most Popular Movies</h3>
                <div className="h-64 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {getPopularMoviesData().map((movie: any, index: number) => (
                      <div key={movie.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-black text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{movie.title}</p>
                            <p className="text-[10px] text-white/40">{movie.language} • ★ {movie.rating}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-400">{movie.views} views</p>
                          <p className="text-[10px] text-white/40">{movie.searches} searches</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* User Type Distribution */}
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 text-white/60">User Type Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(visitStats.userTypeStats || []).map((stat: any) => (
                  <div key={stat.user_type} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40">{stat.user_type}</p>
                      <p className="text-2xl font-black text-white">{stat.count.toLocaleString()}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${stat.user_type === 'registered' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                      <Users size={24} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Users size={24} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest" style={{ color: 'var(--theme-text)' }}>Unified Activity Log ({activityLogs.length} Events)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-zinc-500 border-b border-white/10">
                <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">User</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Type</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Action</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] tracking-[0.2em]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(activityLogs.length > 0 ? activityLogs : []).slice(0, 50).map(log => (
                <tr key={log.id} className="transition-colors border-b border-white/5">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center font-black text-[10px] bg-white/5 text-zinc-400">
                        {(log.username || 'G').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-100">{log.username || 'Guest User'}</p>
                        <p className="text-[10px] font-medium text-zinc-500">{log.email || 'guest@chalachitra.com'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${log.user_type === 'registered' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                      {log.user_type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium tracking-tight ${theme === 'dark' ? 'text-white/60' : 'text-emerald-900/70'}`}>
                        Viewed {log.page_viewed} page
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                    {new Date(log.visit_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activityLogs.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-white/20 uppercase tracking-widest text-xs font-black">No activity logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
