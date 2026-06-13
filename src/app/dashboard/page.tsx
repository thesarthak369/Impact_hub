"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Activity, AlertTriangle, Users, Map as MapIcon, Settings, Search, Bell, Menu, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { user, role, metadata, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
      if (role === "ngo") {
        router.push("/ngo-dashboard");
      } else if (role === "volunteer") {
        router.push("/volunteer-dashboard");
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // If no role or admin, show the original generic dashboard content below
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-helvetica flex overflow-hidden">
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-foreground/[0.06] bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
              <input 
                type="text" 
                placeholder="Search incidents, resources..." 
                className="pl-9 pr-4 py-1.5 bg-foreground/[0.03] border border-foreground/[0.06] rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 text-foreground/70 w-64 transition-all focus:w-80"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-accent-muted hover:text-foreground">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-600 to-gray-400 border border-foreground/20" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center h-full text-center py-20">
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Admin Command Center</h1>
            <p className="text-accent-muted max-w-lg mb-8">
              Welcome to the centralized dashboard. From here, you can manage NGOs, volunteers, and oversee the entire emergency response network.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/ngo-dashboard" className="p-6 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors flex flex-col items-center gap-3">
                <AlertTriangle size={24} className="text-accent-muted" />
                <span className="font-semibold">View NGO Dashboard</span>
              </Link>
              <Link href="/volunteer-dashboard" className="p-6 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors flex flex-col items-center gap-3">
                <Users size={24} className="text-accent-muted" />
                <span className="font-semibold">View Volunteer Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
