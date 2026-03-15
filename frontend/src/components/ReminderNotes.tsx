"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StickyNote, Save, Loader2, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ReminderNotesProps {
  profileId: string;
  initialNotes?: string;
}

export default function ReminderNotes({ profileId, initialNotes = '' }: ReminderNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Priority: localStorage (most recent) > initialNotes (from DB)
    const localNotes = localStorage.getItem(`reminders_${profileId}`);
    if (localNotes !== null && localNotes !== undefined) {
      setNotes(localNotes);
    } else {
      setNotes(initialNotes || '');
    }
  }, [initialNotes, profileId]);

  const handleSave = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      // 1. Try to sync with Database (using 'token' field if it exists)
      const { error } = await supabase
        .from('profiles')
        .update({ token: notes })
        .eq('id', profileId);

      // 2. Always save to local storage for instant reliability
      localStorage.setItem(`reminders_${profileId}`, notes);

      if (error) {
        console.warn("Cloud sync failed, using local storage:", error);
        toast.success('Reminders saved locally');
      } else {
        toast.success('Reminders synced to cloud');
      }
      
      setIsDirty(false);
    } catch (error: any) {
      // Fallback: Still save locally if everything crashes
      localStorage.setItem(`reminders_${profileId}`, notes);
      toast.success('Reminders saved locally');
      setIsDirty(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (notes.trim() === '') return;
    if (window.confirm('Are you sure you want to clear all reminders? This cannot be undone once saved.')) {
      setNotes('');
      setIsDirty(true);
      toast.success('Scratchpad cleared');
    }
  };

  return (
    <div className="glass-card rounded-[32px] p-8 border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <StickyNote className="w-32 h-32" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Personal Reminders</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Confidential Scratchpad</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={loading || notes.trim() === ''}
              className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 disabled:opacity-30 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-500"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleSave}
              disabled={loading || !isDirty}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                isDirty 
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95" 
                  : "bg-slate-900/50 text-slate-600 cursor-not-allowed border border-white/5"
              )}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isDirty ? (
                <Save className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
              {loading ? 'Saving...' : isDirty ? 'SAVE' : 'SAVED'}
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Type your strategic reminders here..."
            className="w-full h-40 bg-slate-900/30 border border-white/5 rounded-2xl px-6 py-5 text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none custom-scrollbar leading-relaxed"
          />
          {!notes && (
            <div className="absolute top-5 left-6 pointer-events-none flex items-center gap-2 opacity-20">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
