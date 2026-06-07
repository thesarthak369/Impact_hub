"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ArrowRight, FileText, MapPin, UserCheck, Activity } from "lucide-react";
import Link from "next/link";
import MagneticButton from "../ui/MagneticButton";

export default function HeroSection() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  const rotateY = useTransform(smoothMouseX, [-1, 1], [-20, 20]);
  const rotateX = useTransform(smoothMouseY, [-1, 1], [20, -20]);

  // Parallax values for floating objects
  const obj1X = useTransform(smoothMouseX, [-1, 1], [-50, 50]);
  const obj1Y = useTransform(smoothMouseY, [-1, 1], [-50, 50]);
  const obj2X = useTransform(smoothMouseX, [-1, 1], [40, -40]);
  const obj2Y = useTransform(smoothMouseY, [-1, 1], [40, -40]);
  const obj3X = useTransform(smoothMouseX, [-1, 1], [-30, 30]);
  const obj3Y = useTransform(smoothMouseY, [-1, 1], [30, -30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Deep Cinematic Lighting — Theme-aware */}
      <div className="absolute inset-0 z-[-9999] pointer-events-none">
          {/* Subtle grid with smooth radial fade */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--glass-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--glass-border)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_40%,#000_10%,transparent_80%)]" />

          {/* Monochrome glow effects */}
          <div className="absolute top-[5%] left-[15%] w-[800px] h-[800px] opacity-15 bg-foreground/10 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] opacity-10 bg-foreground/10 blur-[120px] rounded-full" style={{ animationDelay: "2s" }} />
          <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] opacity-10 bg-foreground/5 blur-[100px] rounded-full" />
        </div>

      {/* Floating 3D Objects (PS Context) */}
      <div
        className="absolute inset-0 z-[-10] flex items-center justify-center pointer-events-none perspective-1000"
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="w-full h-full absolute inset-0 max-w-7xl mx-auto"
        >
          {/* Object 1: Scattered Paper Report (Top Left) */}
          <motion.div
            style={{ x: obj1X, y: obj1Y, translateZ: 100 }}
            animate={{ y: [-15, 15, -15], rotateZ: [-5, 5, -5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] md:left-[12%] glass-panel p-5 rounded-2xl border border-foreground/10 shadow-[0_0_40px_var(--glow-color)] w-48 rotate-[-12deg]"
          >
            <FileText className="text-accent-muted w-7 h-7 mb-3" />
            <div className="w-full h-1.5 bg-foreground/8 rounded mb-1.5" />
            <div className="w-3/4 h-1.5 bg-foreground/8 rounded mb-3" />
            <div className="text-[9px] text-accent-dim font-mono tracking-[0.2em] uppercase">Scattered Data</div>
          </motion.div>

          {/* Object 2: Map Pin / Urgent Need (Top Right) */}
          <motion.div
            style={{ x: obj2X, y: obj2Y, translateZ: 150 }}
            animate={{ y: [15, -15, 15], rotateZ: [5, -5, 5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[22%] right-[5%] md:right-[12%] glass-panel p-5 rounded-2xl border border-foreground/10 shadow-[0_0_50px_var(--glow-color)] w-52 rotate-[8deg] flex flex-col items-center text-center"
          >
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-foreground blur-xl opacity-20 rounded-full" />
              <MapPin className="text-foreground/70 w-9 h-9 relative z-10 drop-shadow-lg" />
            </div>
            <div className="text-sm font-bold text-foreground/90 mb-0.5">Sector 7 Crisis</div>
            <div className="text-[9px] text-accent-dim font-mono tracking-[0.2em] uppercase">Urgent Local Need</div>
          </motion.div>

          {/* Object 3: Volunteer Match (Bottom Center/Right) */}
          <motion.div
            style={{ x: obj3X, y: obj3Y, translateZ: 200 }}
            animate={{ y: [-10, 10, -10], rotateZ: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[18%] right-[18%] md:right-[28%] glass-panel p-4 rounded-full border border-foreground/10 shadow-[0_0_40px_var(--glow-color)] flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-foreground/50 to-foreground/80 flex items-center justify-center shadow-[0_0_15px_var(--glow-color)]">
              <UserCheck className="text-background w-5 h-5" />
            </div>
            <div className="pr-3">
              <div className="text-xs font-bold text-foreground/90">Volunteer Matched</div>
              <div className="text-[9px] text-accent-muted font-mono tracking-[0.2em]">ETA: 4 MINS</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Centered Text Content */}
      <div className="container relative z-10 mx-auto px-6 max-w-5xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-6 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
        >
          <Activity size={14} className="text-accent-muted" />
          <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">Smart Resource Allocation</span>
        </motion.div>

        {/* Dynamic Mixed Typography Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[2.75rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-[-0.04em] mb-2 leading-[0.82] flex flex-col items-center"
        >
          <span className="text-foreground drop-shadow-lg">
            Unify Scattered Data.
          </span>

          <span className="flex items-center gap-3">
            <span className="text-gradient">
              Coordinate
            </span>
            <span className="font-serif italic font-light text-gradient-hero">
              Volunteers.
            </span>
          </span>

          <span
            className="text-transparent"
            style={{ WebkitTextStroke: "1.5px var(--accent-muted)" }}
          >
            Save Lives.
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
        >
          <MagneticButton>
            <Link href="/emergency" className="group h-12 px-7 rounded-full border border-red-500/40 bg-red-600 text-white shadow-[0_0_24px_rgba(239,68,68,0.35)] font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.45)] active:scale-[0.97] w-full sm:w-auto">
              Emergency
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>
          </MagneticButton>

          <MagneticButton>
            <Link href="/login" className="group h-12 px-7 rounded-full border border-foreground/25 text-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-foreground hover:text-background hover:border-foreground active:scale-[0.97] w-full sm:w-auto">
             See It in Action
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>
          </MagneticButton>
        </motion.div>

        {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-12 flex items-center gap-6 rounded-full border border-foreground/10 bg-foreground/[0.04] px-5 py-3 text-xs text-accent-muted backdrop-blur-xl shadow-[0_8px_30px_var(--glass-shadow)]"
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
          Live System
        </div>

        <div className="h-3 w-px bg-foreground/10" />

        <div>Open Source</div>

        <div className="h-3 w-px bg-foreground/10" />

        <div>Built for Impact</div>
      </motion.div>
      </div>
    </section>
  );
}
