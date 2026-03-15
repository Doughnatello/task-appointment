"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, CalendarDays, CheckCircle2, Clock, TrendingUp, AlertTriangle, Activity, Briefcase, CalendarCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface MonthlyStats {
  month: string;
  total: number;
  completed: number;
  onTime: number;
  late: number;
  overdue: number;
  upcoming: number;
  inProgress: number;
  date: Date;
  // New fields
  totalWorkingDays: number;    // sum of working days across all tasks with scheduled+end dates
  taskWithDatesCount: number;  // how many tasks had both dates (for averaging)
  lastCompletedDate: Date | null; // most recent actual completion timestamp
}

export default function TaskSummary() {
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    // Helper: count Mon-Fri weekdays between two dates (inclusive)
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

    try {
      const now = new Date();
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('scheduled_at, end_at, status, metadata');

      if (error) throw error;

      const monthlyData: Record<string, MonthlyStats> = {};

      tasks?.forEach(task => {
        const date = new Date(task.scheduled_at || new Date());
        const monthYear = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthYear,
            total: 0,
            completed: 0,
            onTime: 0,
            late: 0,
            overdue: 0,
            upcoming: 0,
            inProgress: 0,
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            totalWorkingDays: 0,
            taskWithDatesCount: 0,
            lastCompletedDate: null,
          };
        }

        monthlyData[monthYear].total++;

        const endAt = task.end_at ? new Date(task.end_at) : null;
        
        let meta = task.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        } else if (!meta) {
          meta = {};
        }

        const completedAt = meta?.completed_at ? new Date(meta.completed_at) : null;
        const confirmedAt = meta?.confirmed_at ? new Date(meta.confirmed_at) : null;
        const scheduledAt = new Date(task.scheduled_at);

        // Working days calculation
        if (endAt) {
          const wd = getWorkingDays(scheduledAt, endAt);
          monthlyData[monthYear].totalWorkingDays += wd;
          monthlyData[monthYear].taskWithDatesCount++;
        }

        // Track latest completion date
        if (completedAt) {
          if (!monthlyData[monthYear].lastCompletedDate ||
              completedAt > monthlyData[monthYear].lastCompletedDate!) {
            monthlyData[monthYear].lastCompletedDate = completedAt;
          }
        }

        if (confirmedAt && confirmedAt.getTime() > scheduledAt.getTime()) {
          monthlyData[monthYear].late++;
        }

        if (task.status === 'completed') {
          monthlyData[monthYear].completed++;
          if (completedAt && endAt) {
            if (completedAt <= endAt) {
              monthlyData[monthYear].onTime++;
            } else {
              monthlyData[monthYear].overdue++;
            }
          } else {
            monthlyData[monthYear].onTime++;
          }
        } else {
          if (endAt && now > endAt) {
            monthlyData[monthYear].overdue++;
          } else if (scheduledAt > now) {
            monthlyData[monthYear].upcoming++;
          } else {
            monthlyData[monthYear].inProgress++;
          }
        }
      });

      const sortedStats = Object.values(monthlyData).sort((a, b) => b.date.getTime() - a.date.getTime());
      setStats(sortedStats);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-44 bg-white/5 rounded-[32px]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <h3 className="text-2xl font-bold text-white tracking-tight">Monthly Task Summary</h3>
      </div>

      <div className="space-y-4">
        {stats.map((stat, index) => {
          const performance = stat.total > 0 ? Math.round((stat.onTime / stat.total) * 100) : 0;
          const completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;

          const barSegments = stat.total > 0 ? [
            { pct: (stat.onTime / stat.total) * 100,     color: 'bg-emerald-500' },
            { pct: (stat.inProgress / stat.total) * 100, color: 'bg-blue-500'    },
            { pct: (stat.upcoming / stat.total) * 100,   color: 'bg-cyan-400'    },
            { pct: (stat.late / stat.total) * 100,       color: 'bg-orange-500'  },
            { pct: (stat.overdue / stat.total) * 100,    color: 'bg-rose-500'    },
          ] : [];

          return (
            <motion.div
              key={stat.month}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="group glass-card rounded-[28px] p-6 border-white/5 hover:border-primary/20 transition-all shadow-xl w-full"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors flex-shrink-0">
                    <CalendarDays className="w-7 h-7 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white">{stat.month}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{stat.total} Tasks Total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black text-white leading-none">{performance}<span className="text-2xl text-primary">%</span></p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Monthly Performance</p>
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-slate-900 mb-6">
                {barSegments.map((seg, i) =>
                  seg.pct > 0 ? (
                    <div
                      key={i}
                      className={`h-full ${seg.color} transition-all duration-700`}
                      style={{ width: `${seg.pct}%` }}
                    />
                  ) : null
                )}
              </div>

              {/* Stats Grid — full width, 6 columns */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Completed',   
                    value: stat.completed,  
                    color: 'text-white',       
                    accent: 'border-white/5',          
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },

                  { label: 'On Time',     
                    value: stat.onTime,     
                    color: 'text-emerald-400', 
                    accent: 'border-emerald-500/20',   
                    icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },

                  { label: 'In Progress', 
                    value: stat.inProgress, 
                    color: 'text-blue-400',    
                    accent: 'border-blue-500/20',      
                    icon: <Activity className="w-4 h-4 text-blue-400" /> },

                  { label: 'Upcoming',    
                    value: stat.upcoming,   
                    color: 'text-cyan-400',    
                    accent: 'border-cyan-400/20',      
                    icon: <Clock className="w-4 h-4 text-cyan-400" /> },

                  { label: 'Late',        
                    value: stat.late,       
                    color: 'text-orange-400',  
                    accent: 'border-orange-500/20',    
                    icon: <AlertTriangle className="w-4 h-4 text-orange-400" /> },

                  { label: 'Overdue',     
                    value: stat.overdue,    
                    color: 'text-rose-400',    
                    accent: 'border-rose-500/20',      
                    icon: <AlertTriangle className="w-4 h-4 text-rose-400" /> },
                    
                ].map(s => (
                  <div key={s.label} className={`bg-slate-950/50 rounded-2xl p-4 border ${s.accent} flex flex-col gap-2`}>
                    <div className="flex items-center gap-2">
                      {s.icon}
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                    </div>
                    <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          s.label === 'On Time'     ? 'bg-emerald-400' :
                          s.label === 'In Progress' ? 'bg-blue-400'    :
                          s.label === 'Upcoming'    ? 'bg-cyan-400'    :
                          s.label === 'Late'        ? 'bg-orange-400'  :
                          s.label === 'Overdue'     ? 'bg-rose-400'    : 'bg-primary'
                        }`}
                        style={{ width: `${stat.total > 0 ? (s.value / stat.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold">{stat.total > 0 ? Math.round((s.value / stat.total) * 100) : 0}%</p>
                  </div>
                ))}
              </div>

              
            </motion.div>
          );
        })}

        {stats.length === 0 && (
          <div className="py-24 text-center glass-card rounded-[28px] border-white/5">
            <BarChart className="w-20 h-20 text-slate-800 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-500">No data available</h3>
            <p className="text-slate-600 text-sm mt-2">Tasks will appear here once they are created.</p>
          </div>
        )}
      </div>
    </div>
  );
}

