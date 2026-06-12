"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MapPin, Navigation, Smartphone, Code2, Globe, Send, Server, Activity, CheckCircle2 } from "lucide-react";

type SimState = "idle" | "transmitting" | "processing" | "dispatched";

export default function SMSFallbackSection() {
  const [simState, setSimState] = useState<SimState>("idle");
  const [typedJSON, setTypedJSON] = useState("");
  const [statusBarTime, setStatusBarTime] = useState("9:41");
  const [chatTime, setChatTime] = useState("Today 9:40 AM");
  
  const fullJSON = `{\n  "location": "Sector 4",\n  "priority": "CRITICAL",\n  "hazard": "Flooding",\n  "resources": ["Boat Rescue"]\n}`;

  // Real-time clock synchronization
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;

      setStatusBarTime(`${displayHours}:${minutes}`);
      setChatTime(`Today ${displayHours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000); // Check every second to cross minute boundaries immediately
    return () => clearInterval(interval);
  }, []);

  const triggerSimulation = () => {
    if (simState !== "idle") return;
    setSimState("transmitting");
    
    // Simulate transmission delay (wave traveling to server)
    setTimeout(() => {
      setSimState("processing");
    }, 1500);
  };

  // Typewriter effect for processing state
  useEffect(() => {
    if (simState === "processing") {
      let i = 0;
      setTypedJSON("");
      const interval = setInterval(() => {
        setTypedJSON((prev) => prev + fullJSON.charAt(i));
        i++;
        if (i === fullJSON.length) {
          clearInterval(interval);
          // Wait a brief moment after typing finishes to drop the pin
          setTimeout(() => setSimState("dispatched"), 600); 
        }
      }, 30); // Typing speed
      return () => clearInterval(interval);
    }
  }, [simState, fullJSON]);

  const reset = () => {
    setSimState("idle");
    setTypedJSON("");
  };

  // 3D Parallax Mouse Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  // Create 3D tilt values
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);
  const rotateZ = useTransform(smoothX, [-0.5, 0.5], [-2, 2]);

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

  return (
    <section id="sms-pipeline" className="relative w-full py-32 overflow-hidden border-y border-foreground/5 rich-bg">
      
      {/* --- AMBIENT BACKGROUND GLOW --- */}
      <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-foreground/[0.03] blur-[100px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-foreground/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10 flex flex-col items-center">
        
        {/* --- STATIC HEADER --- */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/[0.04] mb-8 backdrop-blur-md shadow-[0_0_25px_var(--glow-color)]"
          >
            <Navigation size={14} className="text-accent-muted" />
            <span className="text-xs font-semibold text-foreground/70 tracking-[0.15em] uppercase">The SMS Pipeline</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[3rem] md:text-[4.5rem] lg:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[0.9]"
          >
            <span className="text-foreground drop-shadow-lg">Disaster Doesn't</span><br />
            <span className="text-gradient">Wait for Wi-Fi.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-accent-muted text-lg leading-relaxed"
          >
            Experience how our Cloud Run API intercepts offline SMS messages, parses the raw data using Gemini, and automatically plots critical resources onto the live heatmap.
          </motion.p>
        </div>

        {/* --- 3D PERSPECTIVE WRAPPER --- */}
        <div 
          ref={containerRef}
          className="w-full flex justify-center perspective-[2000px]"
        >
          {/* --- INTERACTIVE LIVING SIMULATION CANVAS (3D TILTED) --- */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{ rotateX, rotateY, rotateZ, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-[1100px] h-auto lg:h-[600px] rounded-[2.5rem] glass-panel overflow-visible shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between p-8 lg:p-12 gap-10 ring-1 ring-foreground/10"
          >
              {/* CANVAS BACKGROUND GRID */}
              <div className="absolute inset-0 rounded-[2.5rem] bg-[linear-gradient(to_right,var(--glass-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--glass-border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" style={{ transform: "translateZ(-20px)" }} />

              {/* SVG CONNECTION LINES (Visible on Desktop) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block" preserveAspectRatio="none" style={{ transform: "translateZ(10px)" }}>
                {/* Path from Phone to Cloud Run */}
                <path d="M 22% 50% L 50% 50%" className="stroke-foreground/10" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                {simState !== "idle" && (
                  <motion.path 
                     d="M 22% 50% L 50% 50%" 
                     className="stroke-foreground" strokeWidth="4" fill="none"
                     initial={{ pathLength: 0, opacity: 1 }}
                     animate={{ pathLength: 1, opacity: simState === "transmitting" ? 1 : 0 }}
                     transition={{ duration: 1.2, ease: "easeInOut" }}
                     style={{ filter: "drop-shadow(0px 0px 8px var(--foreground))" }}
                  />
                )}
                {/* Path from Cloud Run to Map */}
                <path d="M 50% 50% L 78% 50%" className="stroke-foreground/10" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                {simState === "dispatched" && (
                  <motion.path 
                     d="M 50% 50% L 78% 50%" 
                     className="stroke-foreground" strokeWidth="4" fill="none"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                     style={{ filter: "drop-shadow(0px 0px 8px var(--foreground))" }}
                  />
                )}
              </svg>

              {/* 1. THE SEXY REALISTIC PHONE (LEFT) - Popping out in 3D */}
              <div 
                className="relative z-20 w-full lg:w-[280px] h-[400px] lg:h-[500px] rounded-[3rem] border-[8px] border-foreground/[0.08] bg-background shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_0_0_2px_var(--glass-highlight)] flex flex-col overflow-hidden shrink-0 ring-1 ring-foreground/10 group hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-shadow duration-500"
                style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
              >
                  {/* Physical Hardware details (Volume/Power buttons) */}
                  <div className="absolute top-24 -left-2 w-1 h-12 bg-foreground/20 rounded-l-md" />
                  <div className="absolute top-40 -left-2 w-1 h-12 bg-foreground/20 rounded-l-md" />
                  <div className="absolute top-32 -right-2 w-1 h-16 bg-foreground/20 rounded-r-md" />

                  {/* Glare/Reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/[0.02] to-foreground/[0.05] pointer-events-none z-20" />

                  {/* Screen Wallpaper / Background */}
                  <div className="absolute inset-0 bg-background z-0" />

                  {/* Dynamic Island / Notch Area (Always Dark) */}
                  <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20 mt-2 pointer-events-none">
                      <div className="w-[35%] h-5 bg-black rounded-full flex items-center justify-end px-2 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
                      </div>
                  </div>

                  {/* Status Bar */}
                  <div className="relative z-10 pt-2 px-5 flex items-center justify-between text-[10px] font-medium text-foreground/70">
                      <span>{statusBarTime}</span>
                      <div className="flex items-center gap-1.5">
                         <div className="flex gap-0.5 items-end h-2.5">
                             <div className="w-0.5 h-1 bg-foreground/30 rounded-sm" />
                             <div className="w-0.5 h-1.5 bg-foreground/30 rounded-sm" />
                             <div className="w-0.5 h-2 bg-foreground/30 rounded-sm" />
                             <div className="w-0.5 h-2.5 bg-foreground/30 rounded-sm" />
                         </div>
                         <div className="font-bold text-red-500 tracking-wider text-[8px] uppercase">No Service</div>
                      </div>
                  </div>

                  {/* FLOATING INSTRUCTION POPUP OVER PHONE */}
                <AnimatePresence>
                    {simState === "idle" && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-50 top-24 left-1/2 -translate-x-1/2 w-[90%] bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl p-4 shadow-2xl"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-blue-500"><Navigation size={18} fill="currentColor" /></div>
                                <div className="flex-1">
                                    <div className="text-foreground text-[11px] font-bold mb-1.5 tracking-wide uppercase">System Offline</div>
                                    <div className="text-foreground/70 text-[11px] leading-relaxed">
                                        To request help offline, SMS your status to <span className="text-foreground font-bold bg-foreground/10 px-1 py-0.5 rounded">08604227760</span> starting with <span className="text-foreground font-bold bg-foreground/10 px-1 py-0.5 rounded">SOS</span>.
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                  {/* App Header */}
                  <div className="relative z-10 bg-foreground/[0.03] backdrop-blur-md pb-3 pt-4 border-b border-foreground/5 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-white shadow-lg shadow-green-500/20 mb-1">
                              <Navigation size={18} fill="currentColor" />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground/90">Impact Gateway</span>
                          <span className="text-[9px] text-foreground/40">08604227760</span>
                      </div>
                  </div>

                  {/* Chat Area */}
                  <div className="relative z-10 flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                      <div className="self-center text-[10px] font-medium text-foreground/30 uppercase tracking-widest mt-2">
                          {chatTime}
                      </div>
                      
                      {/* Received Message */}
                      <div className="self-start relative max-w-[85%]">
                          <div className="bg-foreground/10 text-foreground/90 p-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-sm">
                              Emergency mode activated. Text your status starting with <span className="font-bold">'SOS'</span>.
                          </div>
                      </div>

                      {/* Sent Message */}
                      <div className="self-end relative max-w-[85%]">
                          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-3 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed shadow-md font-medium">
                              <span className="font-bold opacity-80 uppercase tracking-wide mr-1">SOS</span> Trapped in Sector 4. Flooding is severe. We need a boat rescue for 3 families.
                          </div>
                      </div>
                  </div>
                  
                  {/* Keyboard / Input Area */}
                  <div className="relative z-10 bg-background/80 backdrop-blur-xl border-t border-foreground/5 p-3 pb-6">
                      {simState === "idle" ? (
                          <div className="relative">
                            {/* BOUNCING INSTRUCTION POPUP */}
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                                className="absolute -top-14 left-1/2 -translate-x-1/2 w-[120%] flex flex-col items-center pointer-events-none z-50"
                            >
                                <div className="bg-green-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] tracking-wide uppercase text-center border border-green-400">
                                    Click here to send!
                                </div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-500" />
                            </motion.div>
                            
                            <button 
                                onClick={triggerSimulation}
                                className="group relative w-full flex items-center justify-between bg-foreground/5 border border-green-500/30 rounded-full p-1 pl-4 hover:bg-foreground/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_20px_rgba(34,197,94,0.25)]"
                            >
                                <span className="text-xs text-foreground/40 font-medium tracking-wide">SMS Message</span>
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform">
                                    <Send size={14} className="ml-0.5" />
                                </div>
                            </button>
                          </div>
                      ) : (
                          <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-500 py-2.5 rounded-full font-bold text-xs tracking-wide">
                             <CheckCircle2 size={16} /> Delivered Offline
                          </div>
                      )}
                      {/* Home Indicator */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-foreground/20 rounded-full" />
                  </div>
              </div>

              {/* 2. CLOUD RUN CORE & GEMINI TERMINAL (CENTER) - Highest 3D popping */}
              <div 
                className="relative z-30 flex-1 flex flex-col items-center justify-center min-w-0 w-full h-full max-w-[450px]"
                style={{ transform: "translateZ(80px)", transformStyle: "preserve-3d" }}
              >
                  {/* The Core Ring */}
                  <div className="relative w-24 h-24 flex items-center justify-center mb-8 shrink-0">
                     <div className={`absolute inset-0 rounded-full border border-dashed border-foreground/30 ${simState !== "idle" ? "animate-[spin_4s_linear_infinite]" : ""}`} />
                     <div className={`absolute inset-2 rounded-full border border-foreground/20 ${simState === "processing" ? "animate-[spin_2s_linear_infinite_reverse]" : ""}`} />
                     <div className={`absolute inset-0 bg-foreground opacity-0 rounded-full blur-xl transition-opacity duration-1000 ${simState === "processing" ? "opacity-20" : ""}`} />
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${simState === "processing" ? "bg-foreground shadow-[0_0_40px_var(--glow-color)] text-background scale-110" : "bg-foreground/5 border border-foreground/10 text-foreground/60"}`}>
                        <Server size={24} />
                     </div>
                  </div>

                  {/* The Terminal */}
                  <div className="w-full h-[220px] bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl overflow-hidden font-mono text-xs md:text-sm shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative flex flex-col shrink-0 group hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-shadow duration-500">
                     {/* Terminal Header */}
                     <div className="bg-foreground/[0.02] border-b border-foreground/10 px-4 py-2.5 flex items-center gap-2 shrink-0">
                       <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                       <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                       <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                       <div className="ml-2 text-foreground/40 text-[10px] uppercase tracking-widest flex items-center gap-2">
                         <Code2 size={12} /> cloud-run-gemini.ts
                       </div>
                     </div>

                     {/* Terminal Body */}
                     <div className="p-5 text-foreground/70 flex-1 overflow-hidden flex flex-col">
                         {simState === "idle" && (
                             <div className="opacity-40 flex items-center gap-2 animate-pulse">
                                 <Activity size={14} /> Listening for gateway triggers...
                             </div>
                         )}
                         {simState === "transmitting" && (
                             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground">
                                 <span className="text-accent-muted">&gt;</span> [SYSTEM] Encrypted SMS payload intercepted. <br/>
                                 <span className="text-accent-muted">&gt;</span> [SYSTEM] Routing to serverless instance...
                             </motion.div>
                         )}
                         {(simState === "processing" || simState === "dispatched") && (
                             <div className="flex flex-col h-full">
                                 <div className="text-foreground/50 mb-3"><span className="text-accent-muted">&gt;</span> const data = await Gemini.parse(payload);</div>
                                 <pre className="text-foreground flex-1 whitespace-pre-wrap leading-relaxed">{typedJSON}<span className="animate-pulse">_</span></pre>
                             </div>
                         )}
                     </div>
                  </div>
              </div>

              {/* 3. TACTICAL MAP (RIGHT) - Also popping out */}
              <div 
                className="relative z-20 w-full lg:w-[280px] h-[300px] lg:h-[480px] rounded-[2.5rem] glass-panel border border-foreground/10 overflow-hidden flex items-center justify-center bg-background/30 shrink-0 shadow-[0_30px_60px_rgba(0,0,0,0.5)] group hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-shadow duration-500"
                style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
              >
                 {/* Map Grid */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--glass-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
                 
                 {simState === "dispatched" ? (
                     <motion.div 
                       initial={{ scale: 0, opacity: 0 }} 
                       animate={{ scale: 1, opacity: 1 }} 
                       transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                       className="relative flex flex-col items-center justify-center w-full h-full"
                       style={{ transform: "translateZ(50px)" }}
                     >
                         {/* RADAR RINGS */}
                         <div className="absolute w-[150px] h-[150px] rounded-full border border-green-500/30 animate-[ping_3s_ease-out_infinite]" />
                         <div className="absolute w-[100px] h-[100px] rounded-full border border-green-500/50 animate-[ping_2s_ease-out_infinite_0.5s]" />
                         <div className="absolute w-[50px] h-[50px] rounded-full bg-green-500/20 animate-pulse blur-md" />
                         
                         {/* BEACON */}
                         <div className="relative z-10 flex flex-col items-center">
                           <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 p-1 shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                             <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                               <MapPin size={28} className="text-green-500" fill="currentColor" />
                             </div>
                           </div>
                           
                           {/* STATUS BANNER */}
                           <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                              className="mt-4 flex flex-col items-center gap-1"
                           >
                               <div className="bg-green-500/10 border border-green-500/30 backdrop-blur-md text-green-400 text-[10px] px-3 py-1 rounded-t-lg font-bold tracking-[0.2em] uppercase">
                                   Coordinates Locked
                               </div>
                               <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white text-[11px] px-5 py-2.5 rounded-xl rounded-t-sm font-bold tracking-widest uppercase shadow-[0_10px_20px_rgba(34,197,94,0.3)] flex items-center gap-2">
                                   <CheckCircle2 size={16} /> Rescue Dispatched
                               </div>
                           </motion.div>
                         </div>
                     </motion.div>
                 ) : (
                     <Globe size={64} className="text-foreground/10" strokeWidth={1} style={{ transform: "translateZ(30px)" }} />
                 )}
              </div>

          </motion.div>
        </div>

        {/* Reset Button (Static, outside 3D layer so it's always clickable) */}
        <AnimatePresence>
            {simState === "dispatched" && (
                <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={reset}
                    className="mt-12 glass-panel border border-foreground/10 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:bg-foreground/5 hover:text-foreground hover:border-foreground/30 transition-all z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-foreground/80 cursor-pointer"
                >
                    Reset Simulation
                </motion.button>
            )}
        </AnimatePresence>

      </div>
    </section>
  );
}
