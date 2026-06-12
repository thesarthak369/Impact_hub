"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BrainCircuit, Image as ImageIcon, Map, HeartHandshake, Sparkles } from "lucide-react";

export default function SolutionSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll Marquee for background
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const marquee1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const marquee2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);

  const features = [
    {
      icon: <BrainCircuit />,
      title: "AI Data Extraction",
      description: "Messy reports become structured needs automatically using NLP engines.",
      tag: "NLP",
    },
    {
      icon: <ImageIcon />,
      title: "Vision Damage Analysis",
      description: "Upload images for instant hazard severity grading via computer vision.",
      tag: "CV",
    },
    {
      icon: <Map />,
      title: "Live Heatmap Intelligence",
      description: "Critical zones pulse live on interactive operational maps in real-time.",
      tag: "GIS",
    },
    {
      icon: <HeartHandshake />,
      title: "Smart Volunteer Matching",
      description: "Nearest skilled responders are automatically dispatched first.",
      tag: "AI",
    }
  ];

  return (
    <section id="technology" ref={containerRef} className="relative min-h-[100vh] py-32 overflow-hidden border-y border-foreground/5 rich-bg">
      
      {/* --- SUBTLE AMBIENT BACKGROUND GLOW --- */}
      <div className="absolute top-[25%] right-[5%] w-[500px] h-[500px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] left-[8%] w-[600px] h-[600px] bg-foreground/[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* --- Subtle dot pattern --- */}
      <div className="absolute inset-0 z-0 opacity-[0.025] pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle,_var(--foreground)_1px,_transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* --- ELEGANT BACKGROUND MARQUEE TEXT --- */}
      <div className="absolute inset-0 flex flex-col justify-center gap-24 opacity-[0.03] z-0 font-bold uppercase text-[8rem] lg:text-[12rem] whitespace-nowrap overflow-hidden pointer-events-none select-none leading-none tracking-tighter">
        <motion.div
          style={{ x: marquee1 }}
          className="flex gap-16 text-foreground"
        >
          <span>AI POWERED</span>
          <span>AI POWERED</span>
          <span>AI POWERED</span>
        </motion.div>

        <motion.div
          style={{
            x: marquee2,
            WebkitTextStroke: "2px var(--foreground)",
          }}
          className="flex gap-16 text-transparent"
        >
          <span>ORCHESTRATION</span>
          <span>ORCHESTRATION</span>
          <span>ORCHESTRATION</span>
        </motion.div>
      </div>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="relative z-10 container mx-auto px-6 max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-24">
        
        {/* LEFT COLUMN: ELEGANT TYPOGRAPHY */}
        <div className="flex-1 max-w-xl relative">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-8 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
          >
            <Sparkles size={14} className="text-accent-muted" />
            <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">The Solution</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[3rem] md:text-[4.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[0.9]"
          >
            <span className="text-foreground drop-shadow-lg">Intelligent</span><br />
            <span className="text-gradient">Orchestration.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-accent-muted text-lg leading-relaxed mb-12 max-w-lg"
          >
            A unified system that processes chaos into clarity, matching <strong className="text-foreground font-semibold">needs</strong> with <strong className="text-foreground font-semibold">resources</strong> in record time using the power of AI and real-time intelligence.
          </motion.p>

          {/* FEATURE LIST */}
          <div className="flex flex-col gap-5">
            {features.slice(0, 2).map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="group glass-panel p-5 rounded-2xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-bold text-base mb-0.5">{feature.title}</h4>
                  <p className="text-accent-muted text-sm leading-relaxed">{feature.description}</p>
                </div>
                <div className="flex-shrink-0 px-3 py-1 rounded-full border border-foreground/10 bg-foreground/[0.04] text-[10px] font-bold text-foreground/60 uppercase tracking-wider hidden sm:block">
                  {feature.tag}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: FEATURE GRID */}
        <div className="flex-1 w-full max-w-lg">
          <div className="flex flex-col gap-5">
            {features.slice(2).map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                className="group glass-panel p-5 rounded-2xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-bold text-base mb-0.5">{feature.title}</h4>
                  <p className="text-accent-muted text-sm leading-relaxed">{feature.description}</p>
                </div>
                <div className="flex-shrink-0 px-3 py-1 rounded-full border border-foreground/10 bg-foreground/[0.04] text-[10px] font-bold text-foreground/60 uppercase tracking-wider hidden sm:block">
                  {feature.tag}
                </div>
              </motion.div>
            ))}

            {/* ORCHESTRATION VISUAL BLOCK */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="relative glass-panel p-8 rounded-2xl overflow-hidden"
            >
              {/* Animated shimmer accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent animate-[shimmer-border_3s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} />

              <div className="relative z-10 text-center">
                <div className="text-[4rem] font-bold tracking-[-0.04em] text-foreground leading-none mb-2">
                  10x
                </div>
                <div className="text-xs font-bold text-accent-muted uppercase tracking-[0.2em] mb-4">
                  Faster Response Time
                </div>
                <div className="flex items-center justify-center gap-3">
                  {["Intake", "Analyze", "Route", "Deploy"].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="px-3 py-1.5 rounded-full bg-foreground/[0.06] border border-foreground/10 text-[11px] font-semibold text-foreground/70"
                      >
                        {step}
                      </motion.div>
                      {i < 3 && (
                        <div className="w-4 h-[1px] bg-foreground/15" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
