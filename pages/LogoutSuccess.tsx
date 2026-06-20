import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Home, Film, Sparkles, Tv, ArrowRight, CheckCircle2 } from 'lucide-react';

const LogoutSuccess: React.FC = () => {
  const options = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={28} />,
      path: '/',
      description: 'Explore our latest movie collections and picks.',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'movies',
      label: 'Movies',
      icon: <Film size={28} />,
      path: '/search',
      description: 'Browse through thousands of films in one place.',
      color: 'from-red-500 to-rose-600'
    },
    {
      id: 'series',
      label: 'Series',
      icon: <Tv size={28} />,
      path: '/series',
      description: 'Binge-worthy series and global collections.',
      color: 'from-amber-400 to-orange-600'
    },
    {
      id: 'anime',
      label: 'Anime',
      icon: <Sparkles size={28} />,
      path: '/anime-world',
      description: 'Dive into the best of animation and stories.',
      color: 'from-purple-500 to-fuchsia-600'
    }
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-black">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-4xl w-full text-center">
        <div className="mb-12 animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">Signed Out Successfully</h1>
          <p className="text-zinc-400 font-medium max-w-md mx-auto">Where would you like to explore next? You can still browse our content without an account.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((option, index) => (
            <Link 
              key={option.id}
              to={option.path}
              className="group relative glass-panel p-8 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all duration-500 hover:scale-[1.02] flex flex-col items-start overflow-hidden animate-in slide-in-from-bottom-10"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Hover Background Accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}></div>
              
              <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-gradient-to-br ${option.color} transition-all duration-500`}>
                {option.icon}
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{option.label}</h3>
              <p className="text-zinc-500 group-hover:text-zinc-400 transition-colors text-sm text-left leading-relaxed">{option.description}</p>
              
              <div className="mt-8 flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                Explore Now <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4">
          <span className="w-12 h-px bg-zinc-800"></span>
          Or <Link to="/login" className="text-red-500 hover:text-red-400 transition-colors">Sign back in</Link>
          <span className="w-12 h-px bg-zinc-800"></span>
        </div>
      </div>
    </div>
  );
};

export default LogoutSuccess;
