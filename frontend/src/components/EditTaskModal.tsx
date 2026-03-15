"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, type Profile, type Task } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { X, MapPin, Calendar, User, Save, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSuccess: () => void;
}

export default function EditTaskModal({ isOpen, onClose, task, onSuccess }: EditTaskModalProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    address: task.address,
    employee_id: task.employee_id,
    scheduled_at: task.scheduled_at.slice(0, 16),
    end_at: task.end_at ? task.end_at.slice(0, 16) : '',
    priority: task.priority || 'medium',
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setFormData({
        title: task.title,
        description: task.description,
        address: task.address,
        employee_id: task.employee_id,
        scheduled_at: task.scheduled_at.slice(0, 16),
        end_at: task.end_at ? task.end_at.slice(0, 16) : '',
        priority: task.priority || 'medium',
      });
    }
  }, [isOpen, task]);

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
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          address: formData.address,
          employee_id: formData.employee_id,
          scheduled_at: formData.scheduled_at,
          end_at: formData.end_at,
          priority: formData.priority,
        })
        .eq('id', task.id);
      
      if (error) throw error;
      toast.success('Mission parameters updated');
      onSuccess();
      onClose();
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
                  <h2 className="text-3xl font-bold text-white mb-2">Edit Task</h2>
                  <p className="text-slate-400 font-medium">Reconfigure parameters for operational protocol.</p>
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
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Mission Objective</label>
                      <input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                        placeholder="Task Title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Brief Description</label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full h-32 bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700 resize-none"
                        placeholder="Details..."
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
                          placeholder="Address"
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

                    <div>
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Assigned Employee</label>
                      <div className="relative">
                        <User className="absolute left-5 top-5 w-4 h-4 text-primary" />
                        <select
                          required
                          value={formData.employee_id}
                          onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        >
                          <option value="">Select Employee</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Start Time</label>
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-4 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
                          <input
                            required
                            type="datetime-local"
                            value={formData.scheduled_at}
                            onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">End Time</label>
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
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Confirm Edit
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
