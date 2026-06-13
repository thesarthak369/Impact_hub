"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertTriangle, Users, Map as MapIcon, Settings,
  Search, Bell, Menu, X, BrainCircuit, BarChart3, LogOut,
  ChevronLeft, Sparkles, FileSearch, ShieldAlert, FileText
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "ngo" | "volunteer" | "admin";
}

const ngoLinks = [
  { href: "/ngo-dashboard", label: "Dashboard", icon: Activity },
  { href: "/ngo-posts", label: "My Posts", icon: FileText },
  { href: "/live-map", label: "Live Map", icon: MapIcon },
  { href: "/ai-engine", label: "Data Center", icon: BrainCircuit },
  { href: "/ngo-team", label: "Team", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const volunteerLinks = [
  { href: "/volunteer-dashboard", label: "Dashboard", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: FileSearch },
  { href: "/live-map", label: "Live Map", icon: MapIcon },
  { href: "/ai-briefing", label: "AI Briefing", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/live-map", label: "Live Map", icon: MapIcon },
  { href: "/ai-engine", label: "Data Center", icon: BrainCircuit },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/incidents", label: "Incidents", icon: FileSearch },
];

function DashboardLayoutInner({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role: authRole, metadata, logout } = useAuth();
  const [actualRole, setActualRole] = useState<"ngo" | "volunteer" | "admin">(role);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get("q") || "");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (authRole) {
      setActualRole(authRole as "ngo" | "volunteer" | "admin");
    }
    if (user) {
      if (user.email === "dy3239073@gmail.com" || metadata?.is_admin === true) {
        setIsAdmin(true);
      }
    }
  }, [authRole, user, metadata]);

  const handleSignOut = async () => {
    await logout();
  };

  const baseLinks = actualRole === "ngo" ? ngoLinks : actualRole === "volunteer" ? volunteerLinks : adminLinks;
  const links = isAdmin 
    ? [...baseLinks, { href: "/admin", label: "Admin", icon: ShieldAlert }]
    : baseLinks;
  const roleLabel = actualRole === "ngo" ? "NGO" : actualRole === "volunteer" ? "Volunteer" : "Admin";

  return (
    <div className="min-h-screen bg-background text-foreground font-helvetica flex flex-col relative">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-foreground/[0.05] bg-background/70 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div 
              className="w-5 h-5"
              whileHover={{ rotate: 360, scale: 1.15 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <img src="/logo1.png" alt="Impact Hub Logo" className="w-full h-full object-contain" />
            </motion.div>
            <span className="font-bold tracking-tight text-xs uppercase letter-spacing-wide hidden sm:block">Impact Hub</span>
          </Link>
          <div className="relative hidden sm:block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-accent-dim" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-8 pr-3 py-1.5 bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg text-xs focus:outline-none focus:border-foreground/15 text-foreground w-48 transition-all focus:w-60 placeholder:text-accent-dim shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Link href="/notifications" className="relative text-accent-dim hover:text-foreground transition-colors p-2 rounded-lg hover:bg-foreground/[0.03]">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
          </Link>

          {/* Profile Dropdown */}
          <div className="relative ml-1">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)} 
              className="flex items-center gap-1 focus:outline-none transition-all hover:opacity-90 active:scale-95"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-foreground/15 shadow-sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-foreground/20 to-foreground/40 border border-foreground/15 shadow-sm flex items-center justify-center text-[10px] font-bold uppercase text-foreground">
                  {user?.displayName ? user.displayName[0] : (roleLabel ? roleLabel[0] : 'U')}
                </div>
              )}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  
                  {/* Dropdown Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-foreground/10 bg-background/95 backdrop-blur-xl p-1.5 shadow-2xl z-40"
                  >
                    <div className="p-2.5 pb-2 border-b border-foreground/[0.05] mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{user?.displayName || roleLabel}</p>
                      <p className="text-[9px] text-accent-dim truncate mt-0.5">{user?.email || ""}</p>
                      <span className="inline-block mt-2 px-1.5 py-0.5 rounded bg-foreground/[0.05] text-[8px] font-bold uppercase tracking-wider text-accent-muted border border-foreground/[0.05]">
                        {roleLabel}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <Link 
                        href="/settings" 
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-accent-dim hover:text-foreground hover:bg-foreground/[0.03] transition-all"
                      >
                        <Settings size={13} />
                        <span>Settings</span>
                      </Link>
                    </div>

                    <div className="h-px bg-foreground/[0.05] my-1" />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-24">
        <div className="flex-1 overflow-auto relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none" />
          <div className="relative h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-[10px] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none">
        <div className="bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-[15px] shadow-2xl p-2 flex items-center justify-around pointer-events-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label + link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-foreground bg-foreground/[0.08]"
                    : "text-accent-dim hover:text-foreground hover:bg-foreground/[0.04]"
                }`}
                title={link.label}
              >
                <link.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[9px] font-medium hidden sm:block">{link.label}</span>
              </Link>
            );
          })}
          <div className="w-px h-8 bg-foreground/10 mx-1" />
          <Link
            href="/settings"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
              pathname === "/settings"
                ? "text-foreground bg-foreground/[0.08]"
                : "text-accent-dim hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
            title="Settings"
          >
            <Settings size={20} strokeWidth={pathname === "/settings" ? 2 : 1.5} />
            <span className="text-[9px] font-medium hidden sm:block">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <DashboardLayoutInner {...props} />
    </Suspense>
  );
}
