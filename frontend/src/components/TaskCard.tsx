"use client";

import { Clock, MapPin, User, Calendar, CheckCircle2, AlertCircle, RefreshCcw, Layout, X, Trash2, Edit, Briefcase, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { type Task, type Profile, supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import EditTaskModal from '@/components/EditTaskModal';

interface TaskCardProps {
  task: Task;
  currentProfile: Profile | null;
  onUpdate: (newStatus?: string, task?: Task) => void;
}

export default function TaskCard({ task, currentProfile, onUpdate }: TaskCardProps) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // FIX: Added optional chaining and fallbacks for initial state
  const [newDate, setNewDate] = useState(task.scheduled_at?.slice(0, 16) || '');
  const [newEndDate, setNewEndDate] = useState(task.end_at ? task.end_at.slice(0, 16) : '');
  
  const [targetStatus, setTargetStatus] = useState<'rescheduled' | 'extended' | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'completed' | 'review' | null>(null);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarksInput, setRemarksInput] = useState(task.metadata?.remarks || '');

  const isEmployee = currentProfile?.role === 'employee';
  const isRequester = currentProfile?.id === task.requester_id || ['manager', 'president', 'admin'].includes(currentProfile?.role || '');

  const saveRemarks = async () => {
    try {
      let currentMeta = task.metadata;
      if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
      } else if (!currentMeta) {
        currentMeta = {};
      }
      
      const newMetadata = { ...currentMeta, remarks: remarksInput };
      const { error } = await supabase
        .from('tasks')
        .update({ metadata: newMetadata })
        .eq('id', task.id);
      
      if (error) throw error;
      toast.success('Remarks updated');
      setIsEditingRemarks(false);
      onUpdate(undefined, task);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateStatus = async (newStatus: string, scheduledAt?: string, endAt?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (scheduledAt) updateData.scheduled_at = scheduledAt;
      if (endAt) updateData.end_at = endAt;

      let currentMeta = task.metadata;
      if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
      } else if (!currentMeta) {
        currentMeta = {};
      }

      const newMetadata = { ...currentMeta };
      const now = new Date().toISOString();

      if (newStatus === 'in_progress') {
        newMetadata.confirmed_at = now;
      } else if (newStatus === 'completed' || newStatus === 'review') {
        newMetadata.completed_at = now;
      } else if (newStatus === 'rescheduled' || newStatus === 'extended') {
        // If rescheduling, the previous completion is no longer valid
        delete newMetadata.completed_at;
      }
      updateData.metadata = newMetadata;

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);
      
      if (error) throw error;
      toast.success(`Mission updated to ${newStatus.replace('_', ' ')}`);
      setIsRescheduling(false);
      onUpdate(newStatus, { ...task, status: newStatus as any, scheduled_at: scheduledAt || task.scheduled_at, end_at: endAt || task.end_at });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to terminate this mission? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
      
      if (error) throw error;
      toast.success('Mission successfully terminated');
      onUpdate(undefined, task);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const statusIcons: any = {
    pending_confirmation: AlertCircle,
    in_progress: Clock,
    completed: CheckCircle2,
    review: RefreshCcw,
    rescheduled: Calendar,
    extended: Calendar,
    backlog: Layout
  };

  const now = new Date();
  const isUpcoming = !['completed', 'review'].includes(task.status) && new Date(task.scheduled_at) > now;
  const Icon = isUpcoming ? Calendar : (statusIcons[task.status] || Clock);

  // --- Working days & completion date helpers ---
  function getWorkingDays(start: Date, end: Date): number {
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  const workingDays = task.scheduled_at && task.end_at
    ? getWorkingDays(new Date(task.scheduled_at), new Date(task.end_at))
    : null;

  let meta = task.metadata;
  if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
  const completedAtRaw = meta?.completed_at;
  const completedAt = completedAtRaw ? new Date(completedAtRaw) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "glass-card group flex flex-col p-6 rounded-3xl border-white/5 hover:border-primary/20 transition-all duration-300 relative overflow-hidden h-full",
        task.status !== 'completed' && task.priority === 'urgent' && "ring-1 ring-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
        task.status !== 'completed' && task.priority === 'high' && "ring-1 ring-orange-500/10"
      )}
    >
      {/* Priority Indicator Bar */}
      {task.status !== 'completed' && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300",
          task.priority === 'urgent' ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
          task.priority === 'high' ? "bg-orange-500" :
          task.priority === 'medium' ? "bg-amber-500" :
          "bg-emerald-500"
        )} />
      )}

      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-2">
            {task.status !== 'completed' && (
              <span className={cn("status-badge", `status-${task.priority || 'medium'}`)}>
                {task.priority || 'medium'}
              </span>
            )}
            {(() => {
              const now = new Date();
              const scheduledAt = new Date(task.scheduled_at);
              const isUpcoming = !['completed', 'review'].includes(task.status) && scheduledAt > now;
              const displayStatus = isUpcoming ? 'upcoming' : task.status;
              
              return (
                <span className={cn("status-badge", `status-${displayStatus}`)}>
                  {displayStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              );
            })()}
            {isRequester && (
              <div className="flex gap-2">
                {task.status !== 'completed' && (
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="p-1 px-2 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all"
                    title="Edit Mission"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={handleDelete}
                  className="p-1 px-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                  title="Terminate Mission"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            ID: {task.id?.slice(0, 8) || 'N/A'}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{task.title}</h3>
        <p className="text-slate-400 text-sm mb-6 line-clamp-3 font-medium flex-grow">
          {task.description}
        </p>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="p-1.5 bg-slate-900 rounded-lg"><MapPin className="w-4 h-4 text-primary" /></div>
            <span className="truncate">{task.address}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="p-1.5 bg-slate-900 rounded-lg"><Calendar className="w-4 h-4 text-primary" /></div>
            <span>
              {task.scheduled_at ? (
                <>
                  {new Date(task.scheduled_at).toLocaleDateString()} at {new Date(task.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : 'No date set'}
              {task.end_at && (
                <>
                  {' '}—{' '}
                  {new Date(task.scheduled_at).toLocaleDateString() === new Date(task.end_at).toLocaleDateString() ? 
                    new Date(task.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                    `${new Date(task.end_at).toLocaleDateString()} at ${new Date(task.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  }
                </>
              )}
            </span>
          </div>

          {/* Working Days */}
          {workingDays !== null && (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="p-1.5 bg-slate-900 rounded-lg"><Briefcase className="w-4 h-4 text-indigo-400" /></div>
              <span>
                <span className="font-bold text-indigo-400">{workingDays}</span>
                {' '}working day{workingDays !== 1 ? 's' : ''} required
              </span>
            </div>
          )}

          {/* Actual Completion Date */}
          {completedAt && ['completed', 'review'].includes(task.status) && (
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 bg-slate-900 rounded-lg"><CalendarCheck className="w-4 h-4 text-emerald-400" /></div>
              <span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Finished:</span>
                <span className="font-bold text-emerald-400">
                  {completedAt.toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-slate-500 ml-1 text-xs">
                  at {completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="w-7 h-7 bg-slate-900 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
              {task.employee?.avatar_url ? (
                <img src={task.employee.avatar_url} alt={task.employee.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <span>
              Assigned: {task.employee?.full_name || 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="w-7 h-7 bg-slate-900 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
              {task.requester?.avatar_url ? (
                <img src={task.requester.avatar_url} alt={task.requester.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <span>Requested by: {task.requester?.full_name || 'System'}</span>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="mb-6 bg-slate-900/30 rounded-xl p-3 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Remarks</span>
            {isEmployee && !isEditingRemarks && (
              <button 
                onClick={() => setIsEditingRemarks(true)}
                className="text-[10px] text-primary hover:text-primary/80 uppercase font-bold tracking-wider"
              >
                {task.metadata?.remarks ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          
          {isEditingRemarks ? (
            <div className="space-y-2">
              <textarea
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="Enter operation remarks..."
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 min-h-[60px] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditingRemarks(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveRemarks}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className={cn("text-xs", task.metadata?.remarks ? "text-slate-300" : "text-slate-600 italic")}>
              {task.metadata?.remarks || "No remarks provided."}
            </p>
          )}
        </div>

        {/* Actions Section */}
        <div className="pt-6 border-t border-white/5 mt-auto flex flex-col gap-2">
          <AnimatePresence mode="wait">
            {isRescheduling ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">New Task Schedule</span>
                  <button onClick={() => setIsRescheduling(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="datetime-local" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                  />
                  <input 
                    type="datetime-local" 
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                  />
                </div>
                <button
                  onClick={() => updateStatus(targetStatus!, newDate, newEndDate)}
                  className="w-full bg-primary text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider"
                >
                  Confirm {targetStatus}
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {isEmployee && task.status === 'pending_confirmation' && (
                  <button
                    onClick={() => updateStatus('in_progress')}
                    className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Task
                  </button>
                )}

                {isEmployee && (task.status === 'in_progress' || task.status === 'rescheduled' || task.status === 'extended') && (
                  <>
                    {confirmStatus ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl flex flex-col gap-3 ${confirmStatus === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-indigo-500/10 border border-indigo-500/20'}`}
                      >
                        <p className={`text-xs font-bold text-center ${confirmStatus === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {confirmStatus === 'completed' ? 'Are you sure you want to mark this task as completed?' : 'Are you certain this task is ready for management review?'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmStatus(null)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/50 hover:bg-slate-900 hover:text-white transition-all"
                          >
                            No, Cancel
                          </button>
                          <button
                            onClick={() => {
                              updateStatus(confirmStatus);
                              setConfirmStatus(null);
                            }}
                            className={`flex-1 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg ${
                              confirmStatus === 'completed' 
                                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
                                : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
                            }`}
                          >
                            Yes, Confirm
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex w-full gap-2">
                        <button
                          onClick={() => setConfirmStatus('completed')}
                          className="flex-1 bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Task Completed
                        </button>
                        <button
                          onClick={() => setConfirmStatus('review')}
                          className="flex-1 bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                        >
                          Needs Review
                        </button>
                      </div>
                    )}
                  </>
                )}

                {isRequester && task.status === 'review' && (
                  <div className="flex flex-col w-full gap-2">

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setTargetStatus('rescheduled'); setIsRescheduling(true); }}
                        className="flex-1 bg-orange-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => { setTargetStatus('extended'); setIsRescheduling(true); }}
                        className="flex-1 bg-amber-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                      >
                        Extend
                      </button>
                    </div>
                  </div>
                )}
                
                {task.status === 'completed' && (
                  <div className="w-full flex items-center justify-center py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">
                    Task Completed
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <EditTaskModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        onSuccess={() => onUpdate(undefined, task)}
      />
    </motion.div>
  );
}