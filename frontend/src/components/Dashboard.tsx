"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase, type Profile, type Task, type TaskStatus } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, LogOut, User, Command, Layout, Calendar, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from '@/components/TaskCard';
import CreateTaskModal from '@/components/CreateTaskModal';
import ProfileModal from '@/components/ProfileModal';
import EmployeeList from '@/components/EmployeeList';
import TaskSummary from '@/components/TaskSummary';
import ReminderNotes from '@/components/ReminderNotes';

interface DashboardProps {
  profile: Profile | null;
  session?: any;
  onRefreshProfile?: () => void;
}

export default function Dashboard({ profile, session, onRefreshProfile }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all' | 'upcoming'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Refs so the realtime callback always reads the latest values (avoids stale closure)
  const selectedEmployeeIdRef = useRef<string | null>(null);
  const profileRef = useRef<typeof profile>(profile);
  profileRef.current = profile;
  selectedEmployeeIdRef.current = selectedEmployeeId;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userMetadata = session?.user?.user_metadata || {};
  
  const isActuallyAdmin = ['admin', 'president'].includes(profile?.role || userMetadata?.role || '');
  const isActuallyManager = profile?.role === 'manager' || userMetadata?.role === 'manager';

  // FIX: Optimized effectiveProfile to prioritize the live 'profile' prop from parent
  const effectiveProfile: any = profile ? { 
    ...profile, 
    role: profile.role,
    // The profile.avatar_url is updated by the onRefreshProfile call in the modal
    avatar_url: profile.avatar_url 
  } : {
    id: session?.user?.id || '',
    full_name: userMetadata?.full_name || 'Admin User',
    role: userMetadata?.role || 'admin',
    avatar_url: userMetadata?.avatar_url || null
  };

  const isRequester = effectiveProfile?.role !== 'employee';

  const [view, setView] = useState<'reminders' | 'tasks' | 'employees' | 'summary'>('tasks');

  const myTasks = tasks.filter(t => t.employee_id === (profile?.id || session?.user?.id));
  const otherTasks = tasks.filter(t => t.employee_id !== (profile?.id || session?.user?.id));

  const handleUpdateSuccess = (newStatus?: string, task?: Task) => {
    fetchTasks();
    if (['in_progress', 'rescheduled', 'extended'].includes(newStatus || '')) {
      const now = new Date();
      const scheduledAt = task?.scheduled_at ? new Date(task.scheduled_at) : now;
      
      if (scheduledAt > now) {
        setFilterStatus('upcoming');
      } else {
        setFilterStatus('in_progress');
      }
    }
  };

  async function fetchTasks() {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    try {
      setLoading(true);
      let query = supabase
        .from('tasks')
        .select(`
          *,
          employee:profiles!employee_id(full_name, avatar_url),
          requester:profiles!requester_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (currentProfile.role === 'employee') {
        query = query.eq('employee_id', currentProfile.id);
      } else if (selectedEmployeeIdRef.current) {
        query = query.eq('employee_id', selectedEmployeeIdRef.current);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }



  useEffect(() => {
    if (!profile) return;

    fetchTasks();

    const subscription = supabase
      .channel(`tasks-updates-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [filterStatus, profile, selectedEmployeeId]);

  const handleLogout = () => supabase.auth.signOut();

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 my-2 rounded-2xl border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <Command className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg text-white leading-tight">Dashboard</h1>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter -mt-0.5">
              <span className="text-white">{profile?.role}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 p-1 pr-3 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center group-hover:ring-2 ring-primary/20 transition-all">
              {effectiveProfile?.avatar_url ? (
                <img key={effectiveProfile.avatar_url} src={effectiveProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors leading-none">{effectiveProfile?.full_name}</span>
              <span className="text-[8px] font-black uppercase text-primary/70 tracking-widest leading-none">
                {profile?.position || (profile?.role === 'admin' ? 'Admin' : profile?.role === 'manager' ? 'Manager' : 'Operator')}
              </span>
            </div>
          </button>

          <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-rose-400 group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
        onUpdate={() => {
          onRefreshProfile?.(); 
          fetchTasks();         
        }}
      />

      <main className="max-w-7xl mx-auto pt-24 px-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center ring-4 ring-primary/10 shadow-2xl">
              {effectiveProfile?.avatar_url ? (
                <img key={effectiveProfile.avatar_url} src={effectiveProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-700" />
              )}
            </div>
            <div>
              <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-6xl font-black text-white mb-1 tracking-tight">
                {effectiveProfile?.full_name}
              </motion.h2>
              <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="text-sm font-bold text-primary/80 uppercase tracking-[0.2em]">
                {profile?.position || (profile?.role === 'admin' ? 'Admin' : profile?.role === 'manager' ? 'Manager' : 'Operator')}
              </motion.p>
            </div>
          </div>

          {/* Controls / View Switchers */}
          <div className="flex items-center gap-3">

            
              <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-white/5 mr-4">
                <button onClick={() => setView('reminders')} className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", view === 'reminders' ? "bg-white text-slate-950" : "text-slate-500")}>Reminders</button>
                <button onClick={() => setView('tasks')} className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", view === 'tasks' ? "bg-white text-slate-950" : "text-slate-500")}>Tasks</button>
                {(isActuallyManager || isActuallyAdmin) && (
                  <>
                    <button onClick={() => setView('employees')} className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", view === 'employees' ? "bg-white text-slate-950" : "text-slate-500")}>Employees</button>
                    <button onClick={() => setView('summary')} className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", view === 'summary' ? "bg-white text-slate-950" : "text-slate-500")}>Summary</button>
                  </>
                )}
              </div>

            {isRequester && view === 'tasks' && (
              <button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl shadow-lg transition-all flex items-center gap-2 group">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span className="font-bold hidden sm:inline">New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Content View */}
        {view === 'employees' ? (
          <EmployeeList currentProfile={effectiveProfile} onViewDashboard={(id) => { 
            setSelectedEmployeeId(id); 
            setFilterStatus('all');  // reset filter so employee tasks are not hidden
            setView('tasks'); 
          }} />
        ) : view === 'summary' ? (
          <TaskSummary />
        ) : view === 'reminders' ? (
          <ReminderNotes profileId={profile?.id || ''} initialNotes={profile?.token || ''} />
        ) : (
          <div className="space-y-12">
            
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {filterStatus === 'all' ? 'All Tasks' : 
                     filterStatus === 'upcoming' ? 'Upcoming Tasks' :
                     filterStatus === 'in_progress' ? 'In Progress Tasks' :
                     filterStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Tasks'}
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'review', label: 'Review' },
                    { id: 'completed', label: 'Complete' },
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => setFilterStatus(status.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        filterStatus === status.id
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-slate-900/50 text-slate-500 border-white/5 hover:border-white/10"
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />) }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {tasks
                      .filter(task => {
                        const now = new Date();
                        const scheduledAt = new Date(task.scheduled_at);
                        
                        if (filterStatus === 'all') return true;
                        if (filterStatus === 'upcoming') {
                          // Upcoming: Not completed/review AND scheduled in the future
                          return !['completed', 'review'].includes(task.status) && scheduledAt > now;
                        }
                        if (filterStatus === 'in_progress') {
                          // Active: In active status AND scheduled now or in the past
                          const isActiveStatus = ['pending_confirmation', 'in_progress', 'rescheduled', 'extended'].includes(task.status);
                          return isActiveStatus && scheduledAt <= now;
                        }
                        if (filterStatus === 'review') return task.status === 'review';
                        if (filterStatus === 'completed') return task.status === 'completed';
                        return true;
                      })
                      .map((task) => (
                        <TaskCard key={task.id} task={task} currentProfile={profile} onUpdate={handleUpdateSuccess} />
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <CreateTaskModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        currentProfile={profile}
        onSuccess={fetchTasks}
      />
    </div>
  );
}