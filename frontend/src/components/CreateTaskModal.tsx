"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, type Profile } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { X, MapPin, Calendar, User, CheckCircle2, ShieldAlert, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onSuccess: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, currentProfile, onSuccess }: CreateTaskModalProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    employee_id: '',
    scheduled_at: '',
    end_at: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isEmployeeDropdownOpen && !target.closest('.employee-select-container')) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmployeeDropdownOpen]);

  useEffect(() => {
    if (isOpen) fetchEmployees();
  }, [isOpen]);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) return toast.error('Please assign an employee');
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const requesterId = currentProfile?.id || session?.user?.id;

      if (!requesterId) throw new Error('Authenticating operative... please try again.');

      const { error } = await supabase.from('tasks').insert({
        title: formData.title,
        description: formData.description,
        address: formData.address,
        employee_id: formData.employee_id,
        scheduled_at: formData.scheduled_at,
        end_at: formData.end_at,
        priority: formData.priority,
        requester_id: requesterId,
        status: 'pending_confirmation',
      });
      
      if (error) throw error;
      toast.success('Mission successfully deployed');
      onSuccess();
      onClose();
      setFormData({ title: '', description: '', address: '', employee_id: '', scheduled_at: '', end_at: '', priority: 'medium' as const });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-white/10 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl glass-card flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            <div className="p-6 sm:p-8 pb-4 sm:pb-6 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Create Task</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900/20">
              <div className="p-6 sm:p-8 pt-4 sm:pt-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-6 pb-4">
                  <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Task Title</label>
                      <input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                        placeholder="Task Title (e.g. Asset Recovery)"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Brief Description</label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full h-32 bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700 resize-none"
                        placeholder="Details of the operational requirement..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Location Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-5 w-4 h-4 text-primary" />
                        <input
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                          placeholder="Operational Area Address"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Priority Level</label>
                      <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
                        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: p })}
                            className={cn(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                              formData.priority === p 
                                ? p === 'urgent' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" :
                                  p === 'high' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" :
                                  p === 'medium' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                                  "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative employee-select-container">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Assigned Employee</label>
                      <div className="relative">
                        <div 
                          onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-white cursor-pointer focus:ring-2 focus:ring-primary/50 transition-all flex items-center justify-between"
                        >
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          <span className={cn(!formData.employee_id && "text-slate-700")}>
                            {formData.employee_id 
                              ? employees.find(e => e.id === formData.employee_id)?.full_name 
                              : "Select Employee"}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isEmployeeDropdownOpen && "rotate-180")} />
                        </div>

                        <AnimatePresence>
                          {isEmployeeDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute z-[110] left-0 right-0 mt-2 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-card"
                            >
                              <div className="p-3 border-b border-white/5">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                  <input
                                    autoFocus
                                    placeholder="Search employees..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                                  />
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {employees
                                  .filter(e => e.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                  .map(emp => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({...formData, employee_id: emp.id});
                                        setIsEmployeeDropdownOpen(false);
                                        setEmployeeSearch('');
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                        formData.employee_id === emp.id 
                                          ? "bg-primary/20 text-primary border border-primary/20" 
                                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                                      )}
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
                                        {emp.avatar_url ? (
                                          <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <User className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold">{emp.full_name}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{emp.position || emp.role}</span>
                                      </div>
                                    </button>
                                  ))}
                                {employees.filter(e => e.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                  <div className="py-8 text-center text-slate-600 text-xs">
                                    No operatives found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Start</label>
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-4 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
                          <input
                            required
                            type="datetime-local"
                            value={formData.scheduled_at}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              // auto-update end_at if it's currently empty, to 1 hour after start
                              if (!formData.end_at && newStart) {
                                const d = new Date(newStart);
                                d.setHours(d.getHours() + 1);
                                setFormData({...formData, scheduled_at: newStart, end_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)});
                              } else {
                                setFormData({...formData, scheduled_at: newStart});
                              }
                            }}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">End</label>
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-4 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
                          <input
                            required
                            type="datetime-local"
                            value={formData.end_at}
                            onChange={(e) => setFormData({...formData, end_at: e.target.value})}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <div className="p-6 sm:p-8 pt-4 sm:pt-6 border-t border-white/5 flex gap-4 bg-slate-950/80 backdrop-blur-xl flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-colors border border-white/5"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="flex-[2] bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
