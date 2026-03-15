"use client";

import { useState, useEffect } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import Dashboard from "@/components/Dashboard";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setSession(session);
      await fetchProfile(session.user.id);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        router.push("/");
      } else {
        setSession(session);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function fetchProfile(id: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (data) setProfile(data);
      if (error) console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Dashboard 
      profile={profile} 
      session={session} 
      onRefreshProfile={() => fetchProfile(session!.user.id)} 
    />
  );
}
