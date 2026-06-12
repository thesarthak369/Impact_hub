"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FileStack, Clock, Users, AlertTriangle,
  BrainCircuit, Image as ImageIcon, Map, HeartHandshake, Sparkles
} from "lucide-react";

export default function HorizontalScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // --- Core horizontal transform ---
  // Rest at 0% for the first 15% of scroll, slide from 15% to 85%, rest at -50% for the final 15%
  const x = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], ["0%", "0%", "-50%", "-50%"]);



  // --- Marquee parallax ---
  const marquee1X = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const marquee2X = useTransform(scrollYProgress, [0, 1], ["-20%", "0%"]);

  // --- Data ---
  const problems = [
    {
      icon: <FileStack strokeWidth={1.5} size={22} />,
      title: "Scattered Reports",
      desc: "Paper surveys, WhatsApp messages, and spreadsheets create chaotic, disconnected data silos.",
      stat: "73%",
      statLabel: "Data Lost",
    },
    {
      icon: <Clock strokeWidth={1.5} size={22} />,
      title: "Slow Decisions",
      desc: "By the time data is compiled, the ground reality has already changed — costing lives.",
      stat: "48hr",
      statLabel: "Avg. Delay",
    },
    {
      icon: <Users strokeWidth={1.5} size={22} />,
      title: "Poor Coordination",
      desc: "Volunteers and resources are sent to wrong places, duplicating efforts while critical areas go unserved.",
      stat: "3x",
      statLabel: "Duplication",
    },
  ];

  const features = [
    { icon: <BrainCircuit size={20} />, title: "AI Data Extraction", desc: "Messy reports become structured needs via NLP.", tag: "NLP" },
    { icon: <ImageIcon size={20} />, title: "Vision Damage Analysis", desc: "Instant hazard severity grading via computer vision.", tag: "CV" },
    { icon: <Map size={20} />, title: "Live Heatmap Intelligence", desc: "Critical zones pulse live on operational maps.", tag: "GIS" },
    { icon: <HeartHandshake size={20} />, title: "Smart Volunteer Matching", desc: "Nearest skilled responders dispatched automatically.", tag: "AI" },
  ];

  return (
    <div ref={containerRef} className="relative" style={{ height: "300vh" }}>
      {/* Anchor targets for navbar links & scroll spying */}
      <div id="features" className="absolute top-0 left-0 w-full h-[170vh] pointer-events-none" />
      <div id="technology" className="absolute top-[170vh] left-0 w-full h-[130vh] pointer-events-none" />

      <div className="sticky top-0 h-screen overflow-hidden rich-bg border-y border-foreground/5">

        {/* ====== SHARED MARQUEE BACKGROUND ====== */}
        <div className="absolute inset-0 flex flex-col justify-center gap-20 md:gap-24 opacity-[0.025] z-0 font-bold uppercase text-[5rem] md:text-[8rem] lg:text-[12rem] whitespace-nowrap overflow-hidden pointer-events-none select-none leading-none tracking-tighter">
          <motion.div style={{ x: marquee1X }} className="flex gap-12 md:gap-16 text-foreground">
            <span>DATA CHAOS</span>
            <span>AI POWERED</span>
            <span>DATA CHAOS</span>
            <span>AI POWERED</span>
          </motion.div>
          <motion.div
            style={{ x: marquee2X, WebkitTextStroke: "2px var(--foreground)" }}
            className="flex gap-12 md:gap-16 text-transparent"
          >
            <span>HIDDEN COST</span>
            <span>ORCHESTRATION</span>
            <span>HIDDEN COST</span>
            <span>ORCHESTRATION</span>
          </motion.div>
        </div>

        {/* ====== AMBIENT GLOWS ====== */}
        <div className="absolute top-[15%] left-[5%] w-[400px] md:w-[500px] h-[400px] md:h-[500px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-[15%] right-[10%] w-[500px] md:w-[600px] h-[500px] md:h-[600px] bg-foreground/[0.03] blur-[150px] rounded-full pointer-events-none" />

        {/* ====== HORIZONTAL SCROLL TRACK ====== */}
        <motion.div style={{ x }} className="flex h-full w-[200vw]">

          {/* ──────────────────────────────────── */}
          {/*  PANEL 1 — THE PROBLEM              */}
          {/* ──────────────────────────────────── */}
          <div className="w-screen h-full flex-shrink-0 relative flex items-center">
            <div className="container mx-auto px-6 md:px-12 max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20">

              {/* Left: Typography */}
              <div className="flex-1 max-w-xl">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-5 md:mb-8 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
                >
                  <AlertTriangle size={14} className="text-accent-muted" />
                  <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">
                    The Problem
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-[2.5rem] md:text-[3.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-4 md:mb-6 leading-[0.9]"
                >
                  <span className="text-foreground drop-shadow-lg">The Hidden Cost</span>
                  <br />
                  <span className="text-gradient">Of Chaos.</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-accent-muted text-base md:text-lg leading-relaxed max-w-lg"
                >
                  Local social groups and NGOs collect information through{" "}
                  <strong className="text-foreground font-semibold">paper surveys</strong> and{" "}
                  <strong className="text-foreground font-semibold">field reports</strong>. But this
                  valuable data is scattered, making it impossible to see the biggest problems.
                </motion.p>
              </div>

              {/* Right: Problem cards */}
              <div className="flex-1 w-full max-w-lg flex flex-col gap-4">
                {problems.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (i * 0.1) }}
                    className="group glass-panel p-5 md:p-6 rounded-2xl flex items-center gap-4 md:gap-5 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                      {p.icon}
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <h4 className="text-foreground font-bold text-base mb-0.5">{p.title}</h4>
                      <p className="text-accent-muted text-sm leading-relaxed">{p.desc}</p>
                    </div>
                    <div className="relative z-10 flex-shrink-0 text-right hidden sm:block">
                      <div className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-none">
                        {p.stat}
                      </div>
                      <div className="text-[9px] font-semibold text-accent-muted uppercase tracking-wider mt-0.5">
                        {p.statLabel}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────── */}
          {/*  PANEL 2 — THE SOLUTION             */}
          {/* ──────────────────────────────────── */}
          <div className="w-screen h-full flex-shrink-0 relative flex items-center">
            {/* Dot pattern overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none">
              <div className="w-full h-full bg-[radial-gradient(circle,_var(--foreground)_1px,_transparent_1px)] bg-[size:32px_32px]" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20 relative z-10">

              {/* Left: Typography + 2 feature cards */}
              <div className="flex-1 max-w-xl">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-5 md:mb-8 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
                >
                  <Sparkles size={14} className="text-accent-muted" />
                  <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">
                    The Solution
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-[2.5rem] md:text-[3.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-4 md:mb-6 leading-[0.9]"
                >
                  <span className="text-foreground drop-shadow-lg">Intelligent</span>
                  <br />
                  <span className="text-gradient">Orchestration.</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-accent-muted text-base md:text-lg leading-relaxed mb-6 md:mb-10 max-w-lg"
                >
                  A unified system that processes chaos into clarity, matching{" "}
                  <strong className="text-foreground font-semibold">needs</strong> with{" "}
                  <strong className="text-foreground font-semibold">resources</strong> in record time
                  using AI and real-time intelligence.
                </motion.p>

                {/* First 2 feature cards */}
                <div className="flex flex-col gap-3 md:gap-4">
                  {features.slice(0, 2).map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      className="group glass-panel p-4 md:p-5 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                        {f.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-foreground font-bold text-sm md:text-base mb-0.5">{f.title}</h4>
                        <p className="text-accent-muted text-xs md:text-sm leading-relaxed">{f.desc}</p>
                      </div>
                      <div className="flex-shrink-0 px-2.5 py-1 rounded-full border border-foreground/10 bg-foreground/[0.04] text-[9px] font-bold text-foreground/60 uppercase tracking-wider hidden sm:block">
                        {f.tag}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: 2 feature cards + Stats block */}
              <div className="flex-1 w-full max-w-lg flex flex-col gap-3 md:gap-4">
                {features.slice(2).map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="group glass-panel p-4 md:p-5 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300"
                  >
                    <div className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground font-bold text-sm md:text-base mb-0.5">{f.title}</h4>
                      <p className="text-accent-muted text-xs md:text-sm leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="flex-shrink-0 px-2.5 py-1 rounded-full border border-foreground/10 bg-foreground/[0.04] text-[9px] font-bold text-foreground/60 uppercase tracking-wider hidden sm:block">
                      {f.tag}
                    </div>
                  </motion.div>
                ))}

                {/* Orchestration stats block */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="relative glass-panel p-6 md:p-8 rounded-2xl overflow-hidden"
                >
                  {/* Animated top shimmer line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-border" />

                  <div className="relative z-10 text-center">
                    <div className="text-[3rem] md:text-[4rem] font-bold tracking-[-0.04em] text-foreground leading-none mb-2">
                      10x
                    </div>
                    <div className="text-[10px] font-bold text-accent-muted uppercase tracking-[0.2em] mb-4">
                      Faster Response Time
                    </div>
                    <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                      {["Intake", "Analyze", "Route", "Deploy"].map((step, i) => (
                        <div key={i} className="flex items-center gap-2 md:gap-3">
                          <div className="px-2.5 py-1 rounded-full bg-foreground/[0.06] border border-foreground/10 text-[10px] font-semibold text-foreground/70">
                            {step}
                          </div>
                          {i < 3 && <div className="w-3 md:w-4 h-[1px] bg-foreground/15" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
