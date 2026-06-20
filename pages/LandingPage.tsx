
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Film, LogIn, ChevronRight, UserPlus, ShieldAlert, Key, User, Mail, Eye, EyeOff } from 'lucide-react';
import { SimpleDB as DB } from '../services/simpleDb';
import { UserRole, Theme } from '../types';

const LandingPage: React.FC = () => {
  const { setUser, t, theme } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        console.log('Registering user:', email);
        const newUser = await DB.users.register(username, email, password);
        console.log('Registration successful:', newUser);
        setUser(newUser);
      } else if (mode === 'login' || mode === 'admin') {
        console.log('Authenticating user:', email);
        const user = await DB.users.authenticate(email, password);
        console.log('Authentication result:', user);
        
        if (!user) {
          throw new Error("Invalid username/email or password");
        }
        if (mode === 'admin' && user.role !== UserRole.ADMIN) {
          throw new Error("Access denied. Admin privileges required.");
        }
        console.log('Setting user:', user);
        setUser(user);
      }
    } catch (err: any) {
      console.error('Form submit error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === Theme.DARK;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors ${
      isDark 
        ? 'bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-yellow-900/40 via-black to-black' 
        : 'bg-gradient-to-b from-indigo-100 via-white to-indigo-50'
    }`}>
      <div className="text-center max-w-2xl mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
        <div className={`inline-flex p-4 rounded-2xl mb-6 shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-pulse ${
          isDark 
            ? 'bg-yellow-500 text-black' 
            : 'bg-indigo-600 text-white'
        }`}>
          <Film size={48} />
        </div>
        <h1 className={`text-6xl md:text-8xl font-black mb-4 tracking-tighter ${
          isDark ? 'text-white' : 'text-indigo-950'
        }`}>
          Chala<span className={isDark ? 'text-yellow-500' : 'text-indigo-600'}>Chitra</span>
        </h1>
        <p className={`text-xl font-medium italic ${
          isDark ? 'text-white/50' : 'text-indigo-700/60'
        }`}>
          Your Intelligent Movie Companion. Personalized. Multilingual. Intuitive.
        </p>
      </div>

      <div className={`w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border animate-in fade-in slide-in-from-bottom-10 duration-700 ${
        isDark
          ? 'bg-black/60 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]'
          : 'bg-white/80 border-indigo-200 shadow-[0_0_100px_rgba(79,70,229,0.1)]'
      }`}>
        {/* Tab Header */}
        <div className={`flex border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-indigo-200 bg-indigo-50/50'}`}>
          <button 
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              mode === 'login' 
                ? isDark ? 'text-yellow-500 bg-white/5 border-yellow-500' : 'text-indigo-600 bg-white border-indigo-600'
                : isDark ? 'text-white/30 hover:text-white border-transparent' : 'text-indigo-400 hover:text-indigo-600 border-transparent'
            }`}
          >
            Login
          </button>
          <button 
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              mode === 'register'
                ? isDark ? 'text-yellow-500 bg-white/5 border-yellow-500' : 'text-indigo-600 bg-white border-indigo-600'
                : isDark ? 'text-white/30 hover:text-white border-transparent' : 'text-indigo-400 hover:text-indigo-600 border-transparent'
            }`}
          >
            Sign Up
          </button>
          <button 
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              mode === 'admin'
                ? isDark ? 'text-red-500 bg-white/5 border-red-500' : 'text-red-600 bg-white border-red-600'
                : isDark ? 'text-white/30 hover:text-white border-transparent' : 'text-indigo-400 hover:text-indigo-600 border-transparent'
            }`}
          >
            Admin
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className={`mb-6 p-4 border rounded-xl flex items-center gap-3 text-sm animate-in shake duration-300 ${
              isDark
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                  isDark ? 'text-white/30' : 'text-indigo-600'
                }`}>Username</label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark 
                      ? 'text-white/20 group-focus-within:text-yellow-500'
                      : 'text-indigo-400 group-focus-within:text-indigo-600'
                  }`} size={18} />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full px-12 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${
                      isDark
                        ? 'bg-white/5 border border-white/10 focus:ring-yellow-500 text-white placeholder:text-white/10'
                        : 'bg-indigo-50 border border-indigo-200 focus:ring-indigo-600 text-indigo-950 placeholder:text-indigo-400'
                    }`}
                    placeholder="cinemageek"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                isDark ? 'text-white/30' : 'text-indigo-600'
              }`}>Email Address</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                  isDark
                    ? 'text-white/20 group-focus-within:text-yellow-500'
                    : 'text-indigo-400 group-focus-within:text-indigo-600'
                }`} size={18} />
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-12 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${
                    isDark
                      ? 'bg-white/5 border border-white/10 focus:ring-yellow-500 text-white placeholder:text-white/10'
                      : 'bg-indigo-50 border border-indigo-200 focus:ring-indigo-600 text-indigo-950 placeholder:text-indigo-400'
                  }`}
                  placeholder="username or email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                isDark ? 'text-white/30' : 'text-indigo-600'
              }`}>Password</label>
              <div className="relative group">
                <Key className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                  isDark
                    ? 'text-white/20 group-focus-within:text-yellow-500'
                    : 'text-indigo-400 group-focus-within:text-indigo-600'
                }`} size={18} />
                <input 
                  type={showPass ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-12 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${
                    isDark
                      ? 'bg-white/5 border border-white/10 focus:ring-yellow-500 text-white placeholder:text-white/10'
                      : 'bg-indigo-50 border border-indigo-200 focus:ring-indigo-600 text-indigo-950 placeholder:text-indigo-400'
                  }`}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark
                      ? 'text-white/20 hover:text-white'
                      : 'text-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className={`w-4 h-4 rounded accent-yellow-500 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-indigo-50 border-indigo-200'
                }`} />
                <span className={`text-xs transition-colors ${
                  isDark
                    ? 'text-white/40 group-hover:text-white/60'
                    : 'text-indigo-600 group-hover:text-indigo-700'
                }`}>Remember me</span>
              </label>
              <button type="button" className={`text-xs font-bold transition-colors ${
                isDark
                  ? 'text-yellow-500/60 hover:text-yellow-500'
                  : 'text-indigo-600 hover:text-indigo-700'
              }`}>Forgot Password?</button>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 ${
                mode === 'admin'
                  ? isDark ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                  : isDark ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
              }`}
            >
              {isLoading ? (
                <div className={`w-5 h-5 border-2 rounded-full animate-spin ${
                  isDark
                    ? 'border-black/30 border-t-black'
                    : 'border-white/30 border-t-white'
                }`} />
              ) : (
                <>
                  <span>{mode === 'register' ? 'Join Now' : mode === 'admin' ? 'Secure Login' : 'Sign In'}</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className={`mt-8 pt-8 border-t text-center ${
            isDark ? 'border-white/5' : 'border-indigo-200'
          }`}>
            {mode === 'login' ? (
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-indigo-600'}`}>Don't have an account? <button onClick={() => setMode('register')} className={`font-bold hover:underline ${isDark ? 'text-yellow-500' : 'text-indigo-600'}`}>Sign up for free</button></p>
            ) : mode === 'register' ? (
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-indigo-600'}`}>Already a member? <button onClick={() => setMode('login')} className={`font-bold hover:underline ${isDark ? 'text-yellow-500' : 'text-indigo-600'}`}>Log in here</button></p>
            ) : (
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-indigo-600'}`}>Not an admin? <button onClick={() => setMode('login')} className={`font-bold hover:underline ${isDark ? 'text-white/60' : 'text-indigo-600'}`}>Go to User Portal</button></p>
            )}
          </div>
        </div>
      </div>
      
      <div className={`mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4 text-[10px] font-black uppercase tracking-[0.3em] ${
        isDark ? 'text-white/20 hover:text-yellow-500' : 'text-indigo-400 hover:text-indigo-600'
      }`}>
        <span className="hover:text-yellow-500 transition-colors cursor-default">Proprietary Content Network</span>
        <span className="hover:text-yellow-500 transition-colors cursor-default">Smart Recommendation Engine</span>
        <span className="hover:text-yellow-500 transition-colors cursor-default">Kannada Priority</span>
        <span className="hover:text-yellow-500 transition-colors cursor-default">V3 Secure Access</span>
      </div>
    </div>
  );
};

export default LandingPage;
