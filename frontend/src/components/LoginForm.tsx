"use client";

import React, { useState, useEffect } from 'react'; // Consolidated imports
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { LogIn, UserPlus, Shield, User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // We only need one guard
  const router = useRouter();

  // Single source of truth for hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, isMounted]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in successfully!');
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName,
              name: fullName, 
              role: role,
              position: position,
              employee_id: employeeId
            },
          },
        });
        if (error) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Registration successful!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roles: { id: Role; label: string; icon: any }[] = [
    { id: 'manager', label: 'Manager', icon: Shield },
    { id: 'admin', label: 'Admin', icon: Crown },
    { id: 'employee', label: 'Employee', icon: User },
  ];

  // Prevent hydration mismatch by returning null until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-900 opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md glass-card p-8 rounded-3xl"
        >
          <div className="text-center mb-10">
            <div className="flex justify-center gap-6 mb-12">
              <div className="w-28 h-28 bg-white/100 rounded-[2.5rem] flex items-center justify-center border border-white/100 shadow-2xl backdrop-white p-1">
                <img src="/2.png" alt="Logo 1" className="w-full h-full object-contain" />
              </div>
              <div className="w-28 h-28 bg-white/100 rounded-[2.5rem] flex items-center justify-center border border-white/100 shadow-2xl backdrop-white p-1">
                <img src="/1.png" alt="Logo 2" className="w-full h-full object-contain" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300",
                        role === r.id 
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                          : "border-white/5 text-slate-500 hover:border-white/20"
                      )}
                    >
                      <r.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full mt-2 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-600"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 ml-1">Position</label>
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full mt-2 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-600"
                      placeholder="e.g. Field Agent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 ml-1">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full mt-2 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-600"
                      placeholder="e.g. TM-001"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-2 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-600"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-2 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
    </div>
  );
}