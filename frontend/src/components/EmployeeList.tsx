"use client";

import { useState, useEffect } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import { User, Shield, Activity, Trash2, Briefcase, Search, Clock, ShieldAlert, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface EmployeeListProps {
  currentProfile?: Profile | null;
  onViewDashboard?: (id: string) => void;
}

export default function EmployeeList({ currentProfile, onViewDashboard }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, { 
    total: number, 
    completed: number, 
    late: number, 
    early: number, 
    overdue: number,
    lateTasks: { id: string, title: string }[],
    earlyTasks: { id: string, title: string }[],
    overdueTasks: { id: string, title: string }[]
  }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'completed' | 'efficiency' | 'active'>('name');
  const [viewType, setViewType] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    if (currentProfile) {
      fetchEmployees();
      
      // Subscribe to task changes to update stats in real-time
      const subscription = supabase
        .channel('employee-list-task-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchEmployees();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentProfile]);

  async function fetchEmployees() {
    try {
      // Fetch employees (and managers if president or admin)
      let query = supabase
        .from('profiles')
        .select('*');

      if (currentProfile?.role === 'admin' || currentProfile?.role === 'president') {
        query = query.in('role', ['employee', 'manager']);
      } else {
        query = query.eq('role', 'employee');
      }

      const { data: emps, error: empError } = await query.order('full_name');

      if (empError) throw empError;
      setEmployees(emps || []);

      // Fetch task stats for these employees
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, employee_id, status, metadata, scheduled_at, end_at, created_at');

      if (taskError) throw taskError;

      const taskStats: Record<string, any> = {};
      tasks?.forEach(task => {
        if (!task.employee_id) return;
        if (!taskStats[task.employee_id]) {
          taskStats[task.employee_id] = { 
            total: 0, 
            completed: 0, 
            late: 0, 
            early: 0, 
            overdue: 0,
            lateTasks: [],
            earlyTasks: [],
            overdueTasks: []
          };
        }
        taskStats[task.employee_id].total++;
        
        // Safety: Ensure metadata is an object
        let meta = task.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        } else if (!meta) {
          meta = {};
        }

        const confirmedAt = meta?.confirmed_at ? new Date(meta.confirmed_at) : null;
        let completedAt = meta?.completed_at ? new Date(meta.completed_at) : null;
        
        // Fallback for older tasks completed before detailed tracking was added
        if (!completedAt && task.status === 'completed') {
          completedAt = new Date(task.created_at); // Best estimate if metadata is missing
        }

        const scheduledAt = new Date(task.scheduled_at);
        const endAt = new Date(task.end_at);
        const now = new Date();

        // 1. Completion Counter (Only official completed status)
        if (task.status === 'completed') {
          taskStats[task.employee_id].completed++;
        }

        // 2. Late Stat (Confirmed after scheduled start)
        if (confirmedAt && confirmedAt.getTime() > scheduledAt.getTime()) {
          taskStats[task.employee_id].late++;
          taskStats[task.employee_id].lateTasks.push({ id: task.id, title: task.title });
        }
        
        // 3. Early / Overdue (Fixed stats based on completion)
        if (completedAt) {
          if (completedAt.getTime() <= endAt.getTime()) {
            taskStats[task.employee_id].early++;
            taskStats[task.employee_id].earlyTasks.push({ id: task.id, title: task.title });
          } else {
            taskStats[task.employee_id].overdue++;
            taskStats[task.employee_id].overdueTasks.push({ id: task.id, title: task.title });
          }
        } else {
          // 4. Currently Overdue (Active tasks past their deadline)
          if (['in_progress', 'pending_confirmation', 'rescheduled', 'extended'].includes(task.status) && now.getTime() > endAt.getTime()) {
            taskStats[task.employee_id].overdue++;
            taskStats[task.employee_id].overdueTasks.push({ id: task.id, title: task.title });
          }
        }
      });
      setStats(taskStats);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Are you sure you want to decommission operative ${name}? This will permanently remove their profile.`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEmployees(employees.filter(e => e.id !== id));
      toast.success(`Operative ${name} decommissioned successfully`);
    } catch (error: any) {
      toast.error(error.message);
    }
  }


  const filteredEmployees = employees
    .filter(emp => 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.role && emp.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.employee_id && emp.employee_id.toUpperCase().includes(searchQuery.toUpperCase())) ||
      emp.id.slice(0, 8).toUpperCase().includes(searchQuery.toUpperCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'tasks':
          return (stats[b.id]?.total || 0) - (stats[a.id]?.total || 0);
        case 'completed':
          return (stats[b.id]?.completed || 0) - (stats[a.id]?.completed || 0);
        case 'efficiency':
          const effA = stats[a.id]?.total > 0 ? (stats[a.id].completed / stats[a.id].total) : 0;
          const effB = stats[b.id]?.total > 0 ? (stats[b.id].completed / stats[b.id].total) : 0;
          return effB - effA;
        case 'active':
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        case 'name':
        default:
          return a.full_name.localeCompare(b.full_name);
      }
    });

  const managers = filteredEmployees.filter(e => e.role === 'manager');
  const operatives = filteredEmployees.filter(e => e.role === 'employee');

  // Helper component for Employee Card
  function EmployeeCard({ emp }: { emp: Profile }) {
    return (
      <div className="group glass-card rounded-[32px] p-6 border-white/5 hover:border-primary/20 transition-all shadow-xl h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center ring-4 ring-primary/5 group-hover:ring-primary/10 transition-all">
              {emp.avatar_url ? (
                <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-700" />
              )}
            </div>
            <div>
              <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{emp.full_name}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded border border-primary/20">
                  ID: {emp.employee_id || emp.id.slice(0, 8).toUpperCase()}
                </span>
                <Briefcase className="w-3 h-3 text-slate-500 ml-1" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {emp.position || (emp.role === 'manager' ? 'Site Manager' : 'Operative')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className={cn("w-3 h-3", emp.role === 'manager' ? "text-amber-500" : "text-slate-600")} />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", emp.role === 'manager' ? "text-amber-500/80" : "text-slate-600")}>{emp.role}</span>
              </div>
            </div>
          </div>
          {['admin', 'president'].includes(currentProfile?.role || '') && (
            <button 
              onClick={() => handleRemove(emp.id, emp.full_name)}
              className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              title="Remove Employee"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Tasks</span>
            <span className="text-xl font-bold text-white">{stats[emp.id]?.total || 0}</span>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Completed</span>
            <span className="text-xl font-bold text-emerald-500">{stats[emp.id]?.completed || 0}</span>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Efficiency</span>
            <span className="text-xl font-bold text-blue-500">
              {stats[emp.id]?.total > 0
                ? Math.round((stats[emp.id].completed / stats[emp.id].total) * 100)
                : 0}%
            </span>
          </div>
        </div>

        <div className="flex-grow flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Late</span>
              <span className="text-xl font-bold text-orange-500">{stats[emp.id]?.late || 0}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Early</span>
              <span className="text-xl font-bold text-emerald-400">{stats[emp.id]?.early || 0}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Overdue</span>
              <span className="text-xl font-bold text-rose-500">{stats[emp.id]?.overdue || 0}</span>
            </div>
          </div>

          {(stats[emp.id]?.lateTasks?.length > 0 || stats[emp.id]?.overdueTasks?.length > 0) && (
            <div className="bg-slate-950/50 rounded-2xl border border-white/5 p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Task Records</span>
              <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-2">
                {stats[emp.id]?.lateTasks?.map((t: any) => (
                  <div key={`late-${t.id}`} className="flex items-center gap-2 text-[10px] font-medium text-orange-400 bg-orange-400/5 px-2 py-1 rounded-lg border border-orange-400/10">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">LATE: {t.title}</span>
                  </div>
                ))}
                {stats[emp.id]?.overdueTasks?.map((t: any) => (
                  <div key={`overdue-${t.id}`} className="flex items-center gap-2 text-[10px] font-medium text-rose-400 bg-rose-400/5 px-2 py-1 rounded-lg border border-rose-400/10">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="truncate">OVERDUE: {t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <Activity className="w-3.5 h-3.5" />
            <span>Last login: {emp.updated_at ? new Date(emp.updated_at).toLocaleDateString() : 'Never'}</span>
          </div>
          
          {onViewDashboard && (
            <button 
              onClick={() => onViewDashboard(emp.id)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              View Tasks
            </button>
          )}
        </div>
      </div>
    );
  }

  // Helper component for Employee Table
  function EmployeeTable({ data }: { data: Profile[] }) {
    if (data.length === 0) return null;
    return (
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-950/50 border-b border-white/5">
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest"></th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Missions</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Completed</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Efficiency</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Performance</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Last Active</th>
            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((emp) => (
            <tr
              key={emp.id}
              className="group border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-700" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{emp.full_name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-tight">ID: {emp.employee_id || emp.id.slice(0, 8).toUpperCase()} • {emp.position || (emp.role === 'manager' ? 'Site Manager' : 'Operative')}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="text-sm font-bold text-white bg-slate-900 border border-white/5 px-3 py-1 rounded-lg">
                  {stats[emp.id]?.total || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="text-sm font-bold text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-lg">
                  {stats[emp.id]?.completed || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-blue-500">
                    {stats[emp.id]?.total > 0 ? Math.round((stats[emp.id].completed / stats[emp.id].total) * 100) : 0}%
                  </span>
                  <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${stats[emp.id]?.total > 0 ? (stats[emp.id].completed / stats[emp.id].total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-600 uppercase">Late</span>
                    <span className="text-sm font-bold text-orange-500">{stats[emp.id]?.late || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-600 uppercase">Early</span>
                    <span className="text-sm font-bold text-emerald-400">{stats[emp.id]?.early || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-600 uppercase">Overdue</span>
                    <span className="text-sm font-bold text-rose-500">{stats[emp.id]?.overdue || 0}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="text-[10px] font-medium text-slate-500">
                  {emp.updated_at ? new Date(emp.updated_at).toLocaleDateString() : 'Never'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {onViewDashboard && (
                    <button 
                      onClick={() => onViewDashboard(emp.id)}
                      className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="View Records"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  )}
                  {['admin', 'president'].includes(currentProfile?.role || '') && (
                    <button 
                      onClick={() => handleRemove(emp.id, emp.full_name)}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Remove Operative"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Active Employees</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-bold text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer pr-8 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px' }}
            >
              <option value="name">Name (A-Z)</option>
              <option value="tasks">Most Tasks</option>
              <option value="completed">Most Completed</option>
              <option value="efficiency">Highest Efficiency</option>
              <option value="active">Recently Active</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-600"
            />
          </div>
          
          <div className="flex items-center bg-slate-900/50 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewType('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewType === 'grid' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewType === 'table' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-2.5 bg-slate-900/50 rounded-2xl border border-white/5 text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
            {filteredEmployees.length} OF {employees.length} Operatives
          </div>
        </div>
      </div>



      {loading ? (
        <div className={cn(
          viewType === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "w-full space-y-4"
        )}>
          {[1, 2, 3].map(i => (
            <div key={i} className={cn(
              "bg-white/5 rounded-[32px] animate-pulse",
              viewType === 'grid' ? "h-48" : "h-16 w-full"
            )} />
          ))}
        </div>
      ) : (

        <>
          {viewType === 'grid' ? (
            <div className="space-y-12">
              {/* Managers Section */}
              {managers.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                    <h4 className="text-xl font-bold text-white tracking-tight italic">Management</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {managers.map((emp, index) => (
                        <motion.div
                          key={emp.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <EmployeeCard emp={emp} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Regular Operatives Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h4 className="text-xl font-bold text-white tracking-tight">Employee</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {operatives.map((emp, index) => (
                      <motion.div
                        key={emp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <EmployeeCard emp={emp} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {operatives.length === 0 && managers.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <User className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-20" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No operatives found matching your criteria</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <>
              {/* Managers Table Section */}
              {managers.length > 0 && (
                <div className="glass-card rounded-[32px] border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar mb-12">
                  <div className="px-6 py-4 bg-slate-950/30 border-b border-white/5 flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Management</h4>
                  </div>
                  <EmployeeTable data={managers} />
                </div>
              )}

              {/* Regular Operatives Table Section */}
              <div className="glass-card rounded-[32px] border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                <div className="px-6 py-4 bg-slate-950/30 border-b border-white/5 flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Employees</h4>
                </div>
                <EmployeeTable data={operatives} />
                {operatives.length === 0 && managers.length === 0 && (
                  <div className="py-20 text-center border-t border-white/5">
                    <User className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No operatives found matching your criteria</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

