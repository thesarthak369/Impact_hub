"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import Image from "next/image";
import { Brain, MapPin, Smartphone, Activity, ArrowRight } from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

export default function MobileAppSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState("9:41");
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // 3D Mouse Parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [20, -5]); // Slight tilt back
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-35, -5]); // Tilted inward (facing left)
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-12, -2]); // Z-tilt inward (top points left)
  const glowX = useTransform(smoothX, [-0.5, 0.5], ["-20%", "120%"]);
  const glowY = useTransform(smoothY, [-0.5, 0.5], ["-20%", "120%"]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      mouseX.set(x - 0.5);
      mouseY.set(y - 0.5);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      if (container) container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  // Scroll Marquee for background
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const marquee1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const marquee2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);

  return (
    <section id="mobile-app" ref={containerRef} className="relative min-h-[100vh] py-32 overflow-hidden border-y border-foreground/5 rich-bg">
      
      {/* --- SUBTLE AMBIENT BACKGROUND GLOW --- */}
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-foreground/[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* --- ELEGANT BACKGROUND MARQUEE TEXT --- */}
      <div className="absolute inset-0 flex flex-col justify-center gap-24 opacity-[0.03] z-0 font-bold uppercase text-[8rem] lg:text-[12rem] whitespace-nowrap overflow-hidden pointer-events-none select-none leading-none tracking-tighter">
        <motion.div
          style={{ x: marquee1 }}
          className="flex gap-16 text-foreground"
        >
          <span>FLUTTER NATIVE</span>
          <span>FLUTTER NATIVE</span>
          <span>FLUTTER NATIVE</span>
        </motion.div>

        <motion.div
          style={{
            x: marquee2,
            WebkitTextStroke: "2px var(--foreground)",
          }}
          className="flex gap-16 text-transparent"
        >
          <span>GOOGLE AI & MAPS</span>
          <span>GOOGLE AI & MAPS</span>
          <span>GOOGLE AI & MAPS</span>
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
            <Activity size={14} className="text-accent-muted" />
            <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">Mobile Ecosystem</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[3rem] md:text-[4.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[0.9]"
          >
            <span className="text-foreground drop-shadow-lg">Powering Impact</span><br />
            <span className="text-gradient">On The Go.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-accent-muted text-lg leading-relaxed mb-12 max-w-lg"
          >
            We&apos;ve engineered a seamless mobile experience using <strong className="text-foreground font-semibold">Flutter</strong>. By natively integrating <strong className="text-foreground font-semibold">Google AI</strong> and <strong className="text-foreground font-semibold">Maps API</strong>, we deliver a zero-latency tactical command center straight to your pocket.
          </motion.p>

          <div className="flex flex-col gap-5">
            {[
              { icon: <Smartphone />, title: "Built with Flutter", desc: "Native performance across iOS and Android with a unified codebase." },
              { icon: <Brain />, title: "Google AI Intelligence", desc: "Live incident parsing and intelligent, predictive volunteer routing." },
              { icon: <MapPin />, title: "Maps API Integration", desc: "Hyper-accurate geospatial coordination and real-time asset tracking." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="group glass-panel p-5 rounded-2xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-foreground/5 to-foreground/10 border border-foreground/10 shadow-[0_0_15px_var(--glow-color)] text-foreground/80">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-foreground font-bold text-base mb-0.5">{item.title}</h4>
                  <p className="text-accent-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <MagneticButton>
              <a 
                href="https://drive.google.com/drive/folders/1JvNGAJzYF0ID3VmJe50Cm3O4jygEtaEs" 
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full border border-foreground/20 bg-foreground/5 backdrop-blur-md text-foreground font-semibold transition-all duration-500 hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-[0_0_30px_var(--glow-color)] active:scale-[0.97] overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-foreground/0 via-foreground/20 to-foreground/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
                <Smartphone className="relative z-10 w-5 h-5 group-hover:-rotate-12 transition-transform duration-500" />
                <span className="relative z-10 tracking-wider text-sm uppercase font-bold">Get the App</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-500" />
              </a>
            </MagneticButton>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: 3D PARALLAX PHONE IMAGE */}
        <div className="flex-1 w-full flex items-center justify-center lg:justify-end perspective-[2000px] mt-10 lg:mt-0">
          <motion.div
            style={{ rotateX, rotateY, rotateZ, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-[320px] aspect-[1/2.1] z-20 group origin-center"
          >
            {/* 3D CAST SHADOW */}
            <div 
               className="absolute inset-0 bg-black/20 blur-[40px] rounded-[48px] pointer-events-none"
               style={{ transform: "translateZ(-80px) translateY(30px) scale(0.95)" }}
            />

            {/* HARDWARE BUTTONS */}
            <div className="absolute top-[110px] -left-[2.5px] w-[3px] h-[26px] bg-gradient-to-b from-[#666] to-[#222] rounded-l-sm shadow-[-1px_0_1px_rgba(255,255,255,0.3)_inset]" />
            <div className="absolute top-[160px] -left-[2.5px] w-[3px] h-[50px] bg-gradient-to-b from-[#666] to-[#222] rounded-l-sm shadow-[-1px_0_1px_rgba(255,255,255,0.3)_inset]" />
            <div className="absolute top-[220px] -left-[2.5px] w-[3px] h-[50px] bg-gradient-to-b from-[#666] to-[#222] rounded-l-sm shadow-[-1px_0_1px_rgba(255,255,255,0.3)_inset]" />
            <div className="absolute top-[180px] -right-[2.5px] w-[3px] h-[75px] bg-gradient-to-b from-[#666] to-[#222] rounded-r-sm shadow-[1px_0_1px_rgba(255,255,255,0.3)_inset]" />

            {/* IPHONE FRAME */}
            <div 
              className="relative w-full h-full rounded-[48px] p-[8px] bg-gradient-to-br from-[#5a5a5a] via-[#1a1a1a] to-[#4a4a4a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2),inset_0_0_6px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
            >
              <div className="relative w-full h-full rounded-[40px] overflow-hidden bg-black border-[4px] border-black">
                {/* Image component using the user's real image */}
                <Image 
                  src="/phone3.jpeg"
                  alt="Impact Hub Mobile Application"
                  fill
                  className="object-cover scale-[1.02] group-hover:scale-100 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority
                />

                {/* iPhone Status Bar */}
                <div className="absolute top-[-5] inset-x-0 h-12 flex justify-between items-center px-6 z-20 pointer-events-none text-black drop-shadow-sm">
                  {/* Time (Left) */}
                  <div className="text-[13px] font-bold w-[54px] flex justify-center mt-1 tracking-wide">
                    {currentTime}
                  </div>
                  
                  {/* Icons (Right) */}
                  <div className="flex items-center gap-[5px] mt-1">
                    {/* Cellular */}
                    <div className="flex items-end gap-[1px] h-[10px] mb-[1px]">
                      <div className="w-[3px] h-[40%] bg-black rounded-sm" />
                      <div className="w-[3px] h-[60%] bg-black rounded-sm" />
                      <div className="w-[3px] h-[80%] bg-black rounded-sm" />
                      <div className="w-[3px] h-[100%] bg-black rounded-sm" />
                    </div>
                    {/* Wi-Fi */}
                    {/* <svg className="w-3.5 h-3.5 mb-[1px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg> */}
                    {/* Battery */}
                    <div className="w-[22px] h-[11px] border border-black/50 rounded-[3px] p-[1px] relative flex items-center">
                      <div className="bg-black h-full rounded-[1px] w-[80%]" />
                      <div className="absolute -right-[3px] w-[2px] h-[4px] bg-black/50 rounded-r-sm" />
                    </div>
                  </div>
                </div>
                
                {/* Dynamic Island */}
                <div className="absolute top-3 inset-x-0 flex justify-center z-30">
                  <motion.div 
                    onClick={() => setIsIslandExpanded(!isIslandExpanded)}
                    className="bg-black cursor-pointer overflow-hidden flex flex-col justify-center text-white relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                    initial={{ width: 110, height: 32, borderRadius: 16 }}
                    animate={{ 
                      width: isIslandExpanded ? 240 : 110, 
                      height: isIslandExpanded ? 64 : 32,
                      borderRadius: isIslandExpanded ? 32 : 16
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    {/* Collapsed Sensors */}
                    <motion.div 
                      animate={{ 
                        opacity: isIslandExpanded ? 0 : 1,
                        x: isIslandExpanded ? -10 : 0
                      }}
                      className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none"
                    >
                      <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-700 opacity-60"></div>
                      <div className="w-3 h-3 rounded-full bg-[#111] border border-[#222]"></div>
                    </motion.div>

                    {/* Expanded Music Player Content */}
                    <motion.div 
                      animate={{ 
                        opacity: isIslandExpanded ? 1 : 0,
                        y: isIslandExpanded ? 0 : 5,
                        pointerEvents: isIslandExpanded ? "auto" : "none"
                      }}
                      className="absolute inset-0 flex items-center gap-3 px-4 w-full"
                    >
                      {/* Album Art Cover (Currants Vibe) */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E3544C] via-[#944D7C] to-[#4546AC] flex-shrink-0 shadow-md border border-white/10 relative overflow-hidden flex items-center justify-center animate-[spin_6s_linear_infinite]" style={{ animationPlayState: isIslandExpanded ? 'running' : 'paused' }}>
                        <Image src="/image.png" alt="Currants Vibe" className="w-10 h-10 rounded-full " fill />
                      </div>
                      
                      {/* Song Info */}
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <div className="text-[13px] font-semibold text-white truncate leading-tight tracking-tight">Let It Happen</div>
                        <div className="text-[11px] text-white/60 truncate leading-tight">Tame Impala</div>
                      </div>

                      {/* Playing Visualizer (Animated Audio Waves) */}
                      <div className="flex items-center gap-[3px] pr-1 h-3">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div 
                            key={i}
                            animate={isIslandExpanded ? { height: ["20%", "100%", "20%"] } : { height: "20%" }} 
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15, ease: "easeInOut" }} 
                            className="w-[2.5px] bg-[#22c55e] rounded-full origin-bottom" 
                          />
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
                
                {/* Dynamic Responsive Glare */}
                <motion.div 
                  className="absolute inset-0 z-40 pointer-events-none mix-blend-overlay opacity-50"
                  style={{ 
                    background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.8) 25%, transparent 30%)",
                    x: useTransform(smoothX, [-0.5, 0.5], ["-150%", "150%"])
                  }} 
                />
                
                {/* Interactive Spot Glow (follows mouse) */}
                <motion.div 
                  className="absolute w-64 h-64 bg-white/20 rounded-full blur-[60px] pointer-events-none mix-blend-overlay z-40"
                  style={{ left: glowX, top: glowY, transform: "translate(-50%, -50%)" }}
                />
              </div>
            </div>

            {/* FLOATING 3D BADGES (Highly visible & Tilted Inward) */}
            <motion.div 
              style={{ transform: "translateZ(80px) rotateY(-20deg) rotateZ(-5deg)" }}
              className="absolute top-[20%] -right-12 lg:-right-20 bg-background p-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-foreground/15 z-30"
            >
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background shadow-lg">
                <Brain size={18} />
              </div>
              <div className="pr-2">
                <div className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">AI Integration</div>
                <div className="text-sm font-bold text-foreground">Active</div>
              </div>
            </motion.div>

            <motion.div 
              style={{ transform: "translateZ(100px) rotateY(20deg) rotateZ(5deg)" }}
              className="absolute bottom-[25%] -left-10 lg:-left-16 bg-background p-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-foreground/15 z-30"
            >
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background shadow-lg">
                <Activity size={18} />
              </div>
              <div className="pr-2">
                <div className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">Live Sync</div>
                <div className="text-sm font-bold text-foreground">0ms Latency</div>
              </div>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </section>
  );
}

