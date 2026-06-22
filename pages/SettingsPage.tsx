import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Shield, Bell, CheckCircle, RefreshCcw, Globe } from 'lucide-react';
import { SimpleDB as DB } from '../services/simpleDb';
import { Language } from '../types';

const SettingsPage: React.FC = () => {
  const { auth, t, updateUser, theme } = useApp();
  const [priorityLang, setPriorityLang] = useState(auth.user?.preferences?.priorityLanguage || '');
  const [saved, setSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const languages = [
    { code: 'kn', native: 'ಕನ್ನಡ', label: 'Kannada' },
    { code: 'hi', native: 'हिन्दी', label: 'Hindi' },
    { code: 'te', native: 'తెలుగు', label: 'Telugu' },
    { code: 'ta', native: 'தமிழ்', label: 'Tamil' },
    { code: 'ml', native: 'മലയാളം', label: 'Malayalam' },
    { code: 'en', native: 'English', label: 'English' },
  ];

  const handleSavePreferences = async () => {
    if (auth.user) {
      setIsUpdating(true);
      try {
        const updatedUser = { 
          ...auth.user, 
          preferences: {
            ...auth.user.preferences,
            priorityLanguage: priorityLang || null
          }
        };
        await DB.users.updatePreferences(auth.user.id, updatedUser.preferences);
        updateUser(updatedUser);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (error) {
        console.error("Failed to update preferences", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto pb-24">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-10">Account Settings</h1>
      
      <div className="space-y-8">
        <section className="glass-panel p-8 rounded-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center"><User size={24} /></div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Identity Profile</h2>
              <p className="text-sm text-white/50">{auth.user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <span className="block text-[10px] text-white/40 uppercase font-black tracking-widest">Username</span>
              <span className="font-bold text-sm">{auth.user?.username}</span>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <span className="block text-[10px] text-white/40 uppercase font-black tracking-widest">Account Type</span>
              <span className="font-bold text-sm uppercase">{auth.user?.role}</span>
            </div>
          </div>
        </section>

        {/* Priority Language Section */}
        <section className="glass-panel p-8 rounded-3xl border border-emerald-500/10">
           <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{t('priorityLanguage')}</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-slate-700'}`}>{t('priorityDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {languages.map((l) => (
               <button
                key={l.code}
                onClick={() => setPriorityLang(priorityLang === l.code ? '' : l.code)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group active:scale-95 ${
                  priorityLang === l.code 
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                  : 'bg-white/5 border-white/5 hover:border-emerald-500/30'
                }`}
               >
                 <span className={`text-lg font-black ${priorityLang === l.code ? 'text-emerald-500' : (theme === 'dark' ? 'text-white/60' : 'text-emerald-900/80')}`}>{l.native}</span>
                 <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-emerald-900/60'}`}>{l.label}</span>
                 {priorityLang === l.code && <div className="mt-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
               </button>
             ))}
          </div>

          <button 
            onClick={handleSavePreferences}
            disabled={isUpdating}
            className={`w-full py-4 mt-8 rounded-xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50 ${saved ? 'bg-green-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}
          >
            {isUpdating ? <RefreshCcw size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <CheckCircle size={18} />}
            <span>{saved ? 'Preferences Saved' : 'Save Preferences'}</span>
          </button>
        </section>

        <section className="glass-panel p-8 rounded-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center"><Shield size={24} /></div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Security & Nodes</h2>
              <p className="text-sm text-white/50">System-wide preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-white/40" />
                <span className="font-bold text-sm uppercase tracking-tight">Notifications Pipeline</span>
              </div>
              <div className="w-12 h-6 bg-yellow-500 rounded-full flex items-center px-1">
                <div className="w-4 h-4 bg-black rounded-full ml-auto shadow-sm" />
              </div>
            </div>
            <div className="p-4 text-[10px] text-white/20 font-black uppercase tracking-widest text-center">
              Cloud synchronization active • AES-256 Encrypted
            </div>
          </div>
        </section>

        {/* API Keys Configuration removed: now only in Admin Panel */}
      </div>
    </div>
  );
};

export default SettingsPage;
