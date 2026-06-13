"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, Activity, Map as MapIcon, BrainCircuit, BarChart3, AlertTriangle, Users, LogOut, Moon, Sun, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

const defaultLinks: NavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#technology", label: "Tech" },
  { href: "#mobile-app", label: "Mobile" },
  { href: "#sms-pipeline", label: "SMS Node" },
  { href: "#impact", label: "Impact" },
  { href: "#roadmap", label: "Roadmap" },
];

const ngoLinks: NavLink[] = [
  { href: "/ngo-dashboard", label: "Dashboard", icon: Activity },
  { href: "/ngo-dashboard#submit", label: "Submit Report", icon: AlertTriangle },
  { href: "/live-map", label: "Live Map", icon: MapIcon },
  { href: "/ai-engine", label: "AI Engine", icon: BrainCircuit },
];

const volunteerLinks: NavLink[] = [
  { href: "/volunteer-dashboard", label: "Dashboard", icon: Activity },
  { href: "/volunteer-dashboard#missions", label: "Missions", icon: MapIcon },
  { href: "/live-map", label: "Live Map", icon: MapIcon },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // Auth State
  const { user, role, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await logout();
    setIsDropdownOpen(false);
  };

  const pathname = usePathname();
  const isEmergencyRoute = pathname === "/emergency" || pathname.startsWith("/emergency/");

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 30);
  });

  // Track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-30% 0px -50% 0px" }
    );

    defaultLinks.forEach((link) => {
      if (!link.href.startsWith("#")) return;

      const el = document.querySelector(link.href);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const navLinks = role === 'ngo' ? ngoLinks : role === 'volunteer' ? volunteerLinks : defaultLinks;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 pointer-events-none font-helvetica">
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={`pointer-events-auto transition-all duration-700 ease-out w-full rounded-full ${
            isScrolled
              ? "max-w-4xl py-2 px-2 bg-foreground/[0.04] border border-foreground/[0.06] backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
              : "max-w-6xl py-3 px-6 bg-transparent"
          }`}
        >
          <div className={`flex items-center justify-between w-full ${isScrolled ? "px-3" : ""}`}>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div 
                className="w-6 h-6"
                whileHover={{ rotate: 360, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <img src="/logo1.png" alt="Impact Hub Logo" className="w-full h-full object-contain"/>
              </motion.div>
              <span className="font-semibold text-[15px] tracking-tight text-foreground">
                Impact Hub
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href || (link.href === "/emergency" && isEmergencyRoute);
                const isHovered = hoveredLink === link.href;
                const isEmergencyLink = link.href === "/emergency";
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => setHoveredLink(link.href)}
                    onMouseLeave={() => setHoveredLink(null)}
                    className={`relative px-4 py-2 text-[13px] font-medium transition-colors duration-300 flex items-center gap-1.5 ${
                      isEmergencyLink && isActive
                        ? "text-red-100 bg-red-500 border border-red-500/20 rounded-full shadow-[0_0_0_1px_rgba(239,68,68,0.12)]"
                        : isActive
                          ? "text-foreground"
                          : isEmergencyLink
                            ? "text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-full"
                            : "text-accent-dim hover:text-foreground"
                    }`}
                  >
                    {link.icon && <link.icon size={14} className={isEmergencyLink ? (isActive ? "text-red" : "text-red") : isActive ? "text-foreground" : "text-accent"} />}
                    {link.label}
                    {(isActive || isHovered) && (
                      <motion.div
                        layoutId="navUnderline"
                        className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full ${isEmergencyLink ? "bg-red" : "bg-foreground"}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-5">
              <button 
                onClick={toggleTheme} 
                className="p-1.5 rounded-full hover:bg-foreground/5 transition-colors text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="text-[13px] font-medium text-accent-muted hover:text-foreground transition-colors duration-300"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/login"
                    className="group flex items-center gap-1.5 text-[13px] font-medium text-foreground border border-foreground/20 rounded-full px-4 py-1.5 hover:bg-foreground hover:text-background transition-all duration-300"
                  >
                    Launch
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                  </Link>
                </>
              ) : (
                <div className="relative flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-[11px] font-semibold text-foreground">{user?.displayName || 'User'}</span>
                    <span className="text-[9px] text-accent-muted uppercase tracking-widest">{role || 'Setup Required'}</span>
                  </div>
                  {/* WRAPPER for Hover to prevent gap issues */}
                  <div 
                    className="relative pb-4 -mb-4" 
                    onMouseEnter={() => setIsDropdownOpen(true)}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                  >
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full border border-foreground/20 hover:scale-105 transition-transform cursor-pointer relative z-10" 
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-foreground/40 to-foreground/60 border border-foreground/20 hover:scale-105 transition-transform cursor-pointer relative z-10" 
                      />
                    )}

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 0, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 mt-1 w-48 rounded-xl bg-background border border-foreground/[0.08] shadow-2xl overflow-hidden backdrop-blur-xl z-20"
                        >
                          <div className="p-1">
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-foreground/[0.04] rounded-lg transition-colors text-left"
                            >
                              <LogOut size={16} />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden relative w-9 h-9 flex items-center justify-center text-accent-muted hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X size={18} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-20 left-4 right-4 z-50 bg-background/95 backdrop-blur-xl border border-foreground/[0.06] rounded-2xl p-5 max-w-md mx-auto"
            >
              {user && (
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-foreground/[0.04]">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-foreground/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-foreground/40 to-foreground/60 border border-foreground/20" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{user?.displayName || 'User'}</span>
                    <span className="text-[10px] text-accent-dim uppercase tracking-widest">{role || 'Setup Required'}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
                          (link.href === "/emergency" && isEmergencyRoute)
                            ? "text-red-200 bg-red-500/10 border border-red-500/20"
                            : activeSection === link.href
                              ? "text-foreground bg-foreground/[0.05]"
                              : link.href === "/emergency"
                                ? "text-red-300 hover:text-red-200 hover:bg-red-500/10"
                                : "text-accent-muted hover:text-foreground hover:bg-foreground/[0.03]"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.icon && <link.icon size={16} />}
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {user && (
                <div className="mt-4 pt-4 border-t border-foreground/[0.04] flex gap-2">
                  <button
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium text-foreground hover:bg-foreground/5 transition-colors border border-foreground/10"
                  >
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/10"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}

              {!user && (
                <div className="mt-4 pt-4 border-t border-foreground/[0.04] flex flex-col gap-3">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium text-foreground hover:bg-foreground/5 transition-colors border border-foreground/10"
                  >
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </button>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="flex-1 text-center text-sm text-accent-muted hover:text-foreground py-2.5 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/login"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-foreground/20 py-2.5 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Launch
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
