import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { Movie, Theme } from '../types';
import { Sparkles, Play, Star, Clock, Zap, BookOpen, Heart, Sword, Search, X } from 'lucide-react';

const ANIME_GENRE_ID = 16;

const ANIME_CATEGORIES = [
    { id: 'trending', label: 'Trending Now', icon: <Zap size={16} /> },
    { id: 'shonen', label: 'Action & Adventure', icon: <Sword size={16} />, keywords: 'shonen,action,adventure' },
    { id: 'romance', label: 'Romance & Drama', icon: <Heart size={16} />, keywords: 'romance,drama' },
    { id: 'classics', label: 'All-Time Classics', icon: <Star size={16} />, keywords: 'classic' },
    { id: 'movies', label: 'Anime Movies', icon: <Play size={16} />, keywords: 'movie' },
];

const AnimePage: React.FC = () => {
    const { theme, systemKey, setSelectedMovie } = useApp();
    const [heroAnime, setHeroAnime] = useState<Movie | null>(null);
    const [categories, setCategories] = useState<Record<string, Movie[]>>({});
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('trending');
    const [searchTerm, setSearchTerm] = useState('');

    const isDark = theme === Theme.DARK;

    useEffect(() => {
        const apiKey = systemKey || (import.meta as any).env?.VITE_TMDB_API_KEY || '';

        setLoading(true);
        const fetchAll = async () => {
            try {
                const results: Record<string, Movie[]> = {};

                // Fetch Categories
                for (const cat of ANIME_CATEGORIES) {
                    let data: any = { results: [] };
                    try {
                        if (cat.id === 'trending') {
                            data = await TMDB.fetch('/discover/tv', apiKey, { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' }, 'discover');
                        } else if (cat.id === 'shonen') {
                            data = await TMDB.fetch('/discover/tv', apiKey, { with_genres: '16,10759', with_original_language: 'ja', sort_by: 'popularity.desc' }, 'discover'); // 10759 = Action & Adventure for TV
                        } else if (cat.id === 'romance') {
                            data = await TMDB.fetch('/discover/tv', apiKey, { with_genres: '16,18', with_original_language: 'ja', sort_by: 'popularity.desc' }, 'discover'); // 18 = Drama
                        } else if (cat.id === 'classics') {
                            data = await TMDB.fetch('/discover/tv', apiKey, { with_genres: '16', with_original_language: 'ja', sort_by: 'vote_average.desc', 'vote_count.gte': '1500' }, 'discover');
                        } else if (cat.id === 'movies') {
                            data = await TMDB.discoverMovies(apiKey, { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', 'vote_count.gte': '500' });
                        }
                    } catch (err) {
                        console.error(`Failed loading anime cat ${cat.id}`, err);
                    }

                    const normalized = (data.results || []).map((item: any) => ({
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
                        media_type: cat.id === 'movies' ? 'movie' : 'tv'
                    })).filter((m: Movie) => m.poster_path || m.backdrop_path);

                    results[cat.id] = normalized.slice(0, 12);
                }

                setCategories(results);
                if (results['trending']?.length > 0) {
                    setHeroAnime(results['trending'][0]);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load anime data", error);
                setLoading(false);
            }
        };

        fetchAll();
    }, [systemKey]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4 text-indigo-500 animate-pulse">
                    <Sparkles size={48} className="animate-spin-slow" />
                    <p className="font-black text-xs uppercase tracking-[0.5em]">Summoning Anime...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
            {/* Hero Section */}
            {heroAnime && (
                <div className="relative h-[70vh] w-full overflow-hidden">
                    <img
                        src={`https://image.tmdb.org/t/p/original${heroAnime.backdrop_path}`}
                        className="absolute inset-0 w-full h-full object-cover opacity-40 md:opacity-50"
                        alt="Hero Anime"
                    />
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to top, var(--theme-background), color-mix(in srgb, var(--theme-background) 40%, transparent), transparent)' }} />

                    <div className="absolute bottom-12 left-6 md:left-14 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl shadow-indigo-600/20">
                                <Sparkles size={12} /> Seasonal Spotlight
                            </div>
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">• 1080p Ultra HD</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase leading-[0.9]">
                            {heroAnime.title}
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-base mb-8 line-clamp-3 font-medium leading-relaxed max-w-xl italic">
                            "{heroAnime.overview}"
                        </p>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedMovie(heroAnime, true)}
                                className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl flex items-center gap-2"
                            >
                                <Play size={16} fill="black" /> Watch Trailer
                            </button>
                            <div className="flex flex-col">
                                <span className="text-indigo-400 font-black text-lg">{(heroAnime.vote_average || 0).toFixed(1)}</span>
                                <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Global Rating</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Navigation */}
            <div className="px-6 md:px-14 -mt-8 relative z-10 flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {ANIME_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-8 py-3.5 rounded-2xl transition-all flex items-center gap-3 active:scale-95 shadow-xl ${activeCategory === cat.id
                                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                                : isDark ? 'bg-zinc-900 text-zinc-500 hover:text-zinc-300' : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
                            }`}
                    >
                        {cat.icon}
                        <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            <div id="anime-grid" className="px-6 md:px-14 mt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                        <h2 className="text-3xl font-black tracking-tighter uppercase whitespace-nowrap">
                            {ANIME_CATEGORIES.find(c => c.id === activeCategory)?.label}
                        </h2>
                    </div>
                    
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-zinc-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search in this category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-12 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {categories[activeCategory]?.filter(a => 
                        a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        a.original_title.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((anime, idx) => (
                        <div
                            key={anime.id}
                            onClick={() => setSelectedMovie(anime)}
                            className="group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="relative aspect-[11/16] rounded-2xl overflow-hidden mb-4 shadow-2xl transition-all group-hover:scale-105 group-hover:-translate-y-2 ring-0 group-hover:ring-4 ring-indigo-500/50">
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${anime.poster_path}`}
                                    className="w-full h-full object-cover"
                                    alt={anime.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-indigo-400">
                                    HD
                                </div>
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-tighter line-clamp-1 group-hover:text-indigo-400 transition-colors">
                                {anime.title}
                            </h3>
                            <div className="flex items-center justify-between mt-1 opacity-60">
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-bold">{(anime.vote_average || 0).toFixed(1)}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{anime.release_date?.slice(0, 4)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Featured Collection Section */}
            <div className="mt-32 px-6 md:px-14">
                <div className="rounded-[3rem] p-12 md:p-24 border relative overflow-hidden group" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full group-hover:bg-indigo-600/20 transition-all duration-1000" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
                        <div className="md:w-1/2">
                            <div className="flex items-center gap-2 mb-6">
                                <BookOpen size={20} className="text-indigo-500" />
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Curated Collections</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
                                Essential <br /> <span className="text-indigo-600">Masterpieces</span>
                            </h2>
                            <p className="text-zinc-500 text-lg mb-10 leading-relaxed font-medium">
                                Dive into the stories that defined a generation. Hand-picked anime series and movies that represent the pinnacle of Japanese animation.
                            </p>
                            <button 
                                onClick={() => {
                                    setActiveCategory('classics');
                                    document.getElementById('anime-grid')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center gap-3 text-white border-b-2 border-indigo-600 pb-2 text-sm font-black uppercase tracking-[0.2em] hover:text-indigo-400 hover:border-indigo-400 transition-all"
                            >
                                Explore The Vault <Star size={14} />
                            </button>
                        </div>
                        <div className="md:w-1/2 flex gap-4 rotate-3 scale-110">
                            {[0, 1].map(i => (
                                <div key={i} className={`flex-1 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl ${i === 1 ? 'mt-12' : ''}`}>
                                    {categories['movies']?.[i] && (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${categories['movies'][i].poster_path}`}
                                            className="w-full h-full object-cover"
                                            alt="Classic"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimePage;
