import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TMDB } from '../services/tmdb';
import { Movie, Theme } from '../types';
import { Film, RefreshCw, Star, Search, X } from 'lucide-react';
import { GENRES } from '../constants';

const ALL_GENRES = [
    { id: 0, name: 'All' },
    { id: 28, name: 'Action' },
    { id: 35, name: 'Comedy' },
    { id: 18, name: 'Drama' },
    { id: 27, name: 'Horror' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 99, name: 'Documentary' },
];

const LANGUAGES = [
    { code: '', name: 'All Languages' },
    { code: 'kn', name: 'Kannada' },
    { code: 'te', name: 'Telugu' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }
];

const ShortFilmsPage: React.FC = () => {
    const { theme, systemKey, setSelectedMovie } = useApp();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGenre, setSelectedGenre] = useState(0);
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const isDark = theme === Theme.DARK;

    useEffect(() => {
        const apiKey = systemKey || (import.meta as any).env?.VITE_TMDB_API_KEY || '';
        setLoading(true);
        const fetchMovies = async () => {
            try {
                // Fetch 5 pages to get 100+ short films
                const pages = [1, 2, 3, 4, 5];
                let allResults: Movie[] = [];
                
                for (const page of pages) {
                    let data: any;
                    if (selectedGenre !== 0 && selectedLanguage) {
                        // Both filters
                        const params: any = {
                            sort_by: 'popularity.desc',
                            with_genres: selectedGenre.toString(),
                            with_original_language: selectedLanguage,
                            'vote_average.gte': '5',
                            page: page.toString()
                        };
                        data = await TMDB.fetch('/discover/movie', apiKey, params, 'recommendations');
                    } else if (selectedGenre !== 0) {
                        // Genre only
                        const params: any = {
                            sort_by: 'popularity.desc',
                            with_genres: selectedGenre.toString(),
                            'vote_average.gte': '5',
                            page: page.toString()
                        };
                        data = await TMDB.fetch('/discover/movie', apiKey, params, 'recommendations');
                    } else if (selectedLanguage) {
                        // Language only
                        const params: any = {
                            sort_by: 'popularity.desc',
                            with_original_language: selectedLanguage,
                            'vote_average.gte': '5',
                            page: page.toString()
                        };
                        data = await TMDB.fetch('/discover/movie', apiKey, params, 'recommendations');
                    } else {
                        // All movies - use discover without runtime filter
                        const params: any = {
                            sort_by: 'popularity.desc',
                            'vote_average.gte': '5',
                            page: page.toString()
                        };
                        data = await TMDB.fetch('/discover/movie', apiKey, params, 'recommendations');
                    }
                    
                    if (data?.results) {
                        allResults = [...allResults, ...data.results];
                    }
                }
                
                // Remove duplicates and filter for posters
                const uniqueResults = allResults.filter((m, index, self) =>
                    index === self.findIndex(x => x.id === m.id) && m.poster_path
                );
                
                setMovies(uniqueResults);
            } catch (error) {
                console.error('Failed to load short films:', error);
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, [systemKey, selectedGenre, selectedLanguage]);

    return (
        <div className="min-h-screen px-6 py-10 md:px-14" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
            <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-10 bg-red-600 rounded-full" />
                <div>
                    <h1 className="text-4xl font-black tracking-tighter">Movies Library</h1>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Browse {movies.length}+ movies from TMDB database</p>
                </div>
                
                <div className="ml-auto relative w-full max-w-xs hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search movies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-red-600/50 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Search */}
            <div className="mb-6 md:hidden relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-zinc-500" />
                </div>
                <input
                    type="text"
                    placeholder="Search movies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-red-600/50 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Genre Filter */}
            <div className="mb-4">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Genre</p>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {ALL_GENRES.map(g => (
                        <button
                            key={g.id}
                            onClick={() => setSelectedGenre(g.id)}
                            className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedGenre === g.id
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >{g.name}</button>
                    ))}
                </div>
            </div>

            {/* Language Filter */}
            <div className="mb-10">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Language</p>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {LANGUAGES.map(l => (
                        <button
                            key={l.code}
                            onClick={() => setSelectedLanguage(l.code)}
                            className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedLanguage === l.code
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >{l.name}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className={`flex items-center gap-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <RefreshCw className="animate-spin" size={18} /> Loading films...
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(movie => (
                        <button key={movie.id} onClick={() => setSelectedMovie(movie)} className="group text-left">
                            <div className={`aspect-[2/3] rounded-xl overflow-hidden border mb-3 relative ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                                <img
                                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-0.5 text-[10px] font-black text-yellow-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Star size={10} fill="currentColor" /> {(movie.vote_average || 0).toFixed(1)}
                                </div>
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-tight line-clamp-1">{movie.title}</h3>
                            <div className={`flex items-center gap-2 text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                <span>{movie.release_date?.slice(0, 4)}</span>
                                <span>·</span>
                                <span>{movie.original_language?.toUpperCase()}</span>
                            </div>
                        </button>
                    ))}
                    {movies.length === 0 && (
                        <div className="col-span-full text-center py-20">
                            <Film size={48} className={isDark ? 'text-zinc-700 mx-auto mb-4' : 'text-slate-300 mx-auto mb-4'} />
                            <p className={isDark ? 'text-zinc-500' : 'text-slate-400'}>No films found for the selected filters</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShortFilmsPage;
