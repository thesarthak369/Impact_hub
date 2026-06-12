"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FileStack, Clock, Users, AlertTriangle } from "lucide-react";

export default function ProblemSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll Marquee for background
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const marquee1 = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const marquee2 = useTransform(scrollYProgress, [0, 1], ["-25%", "0%"]);

  const problems = [
    {
      icon: <FileStack strokeWidth={1.5} />,
      title: "Scattered Reports",
      description: "Paper surveys, WhatsApp messages, and spreadsheets create chaotic, disconnected data silos that hide critical patterns.",
      stat: "73%",
      statLabel: "Data Lost in Silos",
    },
    {
      icon: <Clock strokeWidth={1.5} />,
      title: "Slow Decisions",
      description: "By the time data is compiled and analyzed, the ground reality has already changed — costing lives and resources.",
      stat: "48hr",
      statLabel: "Avg. Response Delay",
    },
    {
      icon: <Users strokeWidth={1.5} />,
      title: "Poor Coordination",
      description: "Volunteers and resources are often sent to the wrong places, duplicating efforts while critical areas go unserved.",
      stat: "3x",
      statLabel: "Effort Duplication",
    }
  ];

  return (
    <section id="features" ref={containerRef} className="relative min-h-[100vh] py-32 overflow-hidden border-y border-foreground/5 rich-bg">
      
      {/* --- SUBTLE AMBIENT BACKGROUND GLOW --- */}
      <div className="absolute top-[15%] left-[5%] w-[500px] h-[500px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] bg-foreground/[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* --- ELEGANT BACKGROUND MARQUEE TEXT --- */}
      <div className="absolute inset-0 flex flex-col justify-center gap-24 opacity-[0.03] z-0 font-bold uppercase text-[8rem] lg:text-[12rem] whitespace-nowrap overflow-hidden pointer-events-none select-none leading-none tracking-tighter">
        <motion.div
          style={{ x: marquee1 }}
          className="flex gap-16 text-foreground"
        >
          <span>DATA CHAOS</span>
          <span>DATA CHAOS</span>
          <span>DATA CHAOS</span>
        </motion.div>

        <motion.div
          style={{
            x: marquee2,
            WebkitTextStroke: "2px var(--foreground)",
          }}
          className="flex gap-16 text-transparent"
        >
          <span>HIDDEN COST</span>
          <span>HIDDEN COST</span>
          <span>HIDDEN COST</span>
        </motion.div>
      </div>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="relative z-10 container mx-auto px-6 max-w-7xl w-full">
        
        {/* HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-8 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
          >
            <AlertTriangle size={14} className="text-accent-muted" />
            <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">The Problem</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-[3rem] md:text-[4.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[0.9]"
          >
            <span className="text-foreground drop-shadow-lg">The Hidden Cost</span><br />
            <span className="text-gradient">Of Chaos.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-accent-muted text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Local social groups and NGOs collect important information through <strong className="text-foreground font-semibold">paper surveys</strong> and <strong className="text-foreground font-semibold">field reports</strong>. But this valuable data is scattered, making it impossible to see the biggest problems in time.
          </motion.p>
        </div>

        {/* FEATURE CARDS */}
        <div className="flex flex-col gap-5 max-w-4xl mx-auto">
          {problems.map((problem, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + (i * 0.1), duration: 0.6 }}
              className="group glass-panel p-7 rounded-2xl flex items-center gap-6 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
            >
              {/* Hover gradient fill */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon Circle */}
              <div className="relative z-10 w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                {problem.icon}
              </div>

              {/* Text Content */}
              <div className="relative z-10 flex-1 min-w-0">
                <h4 className="text-foreground font-bold text-lg mb-1">{problem.title}</h4>
                <p className="text-accent-muted text-sm leading-relaxed">{problem.description}</p>
              </div>

              {/* Stat Badge */}
              <div className="relative z-10 flex-shrink-0 text-right hidden sm:block">
                <div className="text-2xl font-bold text-foreground tracking-tight leading-none">{problem.stat}</div>
                <div className="text-[10px] font-semibold text-accent-muted uppercase tracking-wider mt-1">{problem.statLabel}</div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
