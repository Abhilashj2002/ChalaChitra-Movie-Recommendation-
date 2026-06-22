import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquareText, Send, Star, RefreshCcw, CheckCircle } from 'lucide-react';
import { SimpleDB as DB } from '../services/simpleDb';

const FeedbackPage: React.FC = () => {
  const { auth, theme } = useApp();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || rating === 0) {
      setFeedbackStatus({ type: 'error', msg: 'Please provide a rating and a message.' });
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      await DB.siteFeedback.add({
        id: Math.random().toString(36).substr(2, 9),
        name: auth.user?.username || 'User',
        userId: auth.user?.id,
        rating,
        message: feedbackMessage,
        timestamp: Date.now()
      });
      setFeedbackStatus({ type: 'success', msg: 'Thank you! Your feedback has been sent.' });
      setFeedbackMessage('');
      setRating(0);
      setTimeout(() => setFeedbackStatus(null), 5000);
    } catch (err) {
      setFeedbackStatus({ type: 'error', msg: 'Failed to send feedback. Please try again.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto pb-24">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-10">Send Us Your Feedback</h1>
      
      <div className="space-y-8">
        <section className="glass-panel p-8 rounded-3xl border border-blue-500/10 mb-20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
              <MessageSquareText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Provide Feedback</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-slate-700'}`}>Tell us how we can improve your experience with ChalaChitra.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div>
              <label className="block text-[10px] text-white/40 uppercase font-black tracking-widest mb-3">Rate your experience</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-all hover:scale-110 active:scale-95"
                  >
                    <Star 
                      size={32} 
                      className={`transition-colors ${(hoverRating || rating) >= star ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-zinc-600'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-white/40 uppercase font-black tracking-widest mb-3">Your Thoughts</label>
              <textarea
                placeholder="What do you think about ChalaChitra? Share your suggestions, issues, or praise!"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                style={{ color: 'var(--theme-text)' }}
              />
            </div>
            
            {feedbackStatus && (
              <div className={`p-4 rounded-xl text-xs font-bold ${feedbackStatus.type === 'success' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                {feedbackStatus.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingFeedback}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50 ${feedbackStatus?.type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
              {isSubmittingFeedback ? <RefreshCcw size={18} className="animate-spin" /> : feedbackStatus?.type === 'success' ? <CheckCircle size={18} /> : <Send size={18} />}
              <span>{feedbackStatus?.type === 'success' ? 'Feedback Sent' : 'Submit Feedback'}</span>
            </button>
          </form>
        </section>

        <section className="glass-panel p-8 rounded-3xl border border-white/5">
          <h2 className="text-xl font-black uppercase tracking-tight mb-4">Why Your Feedback Matters</h2>
          <div className="space-y-3 text-sm text-white/60">
            <p>Your feedback helps us understand what's working well and where we can improve. Whether it's a bug report, feature request, or general thoughts about your experience, we truly value your input.</p>
            <p>All feedback is reviewed by our team and helps shape the future of ChalaChitra. Thank you for taking the time to share your thoughts!</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FeedbackPage;
