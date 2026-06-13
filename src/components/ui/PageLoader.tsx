"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PageLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Accelerating progress curve
        const increment = prev < 60 ? 3 : prev < 85 ? 2 : 1;
        return Math.min(prev + increment, 100);
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  // Network vertex coordinates
  const center = { x: 50, y: 50 };
  const nodes = [
    { x: 20, y: 25 },
    { x: 80, y: 20 },
    { x: 85, y: 75 },
    { x: 15, y: 80 },
    { x: 50, y: 15 },
    { x: 15, y: 50 },
    { x: 85, y: 50 },
    { x: 50, y: 85 },
  ];

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loader"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#030308]"
          >
            {/* Deep background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px]" 
              />
            </div>

            <div className="relative flex flex-col items-center gap-14">
              
              {/* Custom SVG Network Animation */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                  <defs>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Edges / Connections */}
                  {nodes.map((node, i) => (
                    <motion.line
                      key={`edge-${i}`}
                      x1={center.x}
                      y1={center.y}
                      x2={node.x}
                      y2={node.y}
                      stroke="#4f46e5"
                      strokeWidth="0.5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ 
                        pathLength: [0, 1, 1, 0],
                        opacity: [0, 0.6, 0.6, 0]
                      }}
                      transition={{ 
                        duration: 2.5, 
                        delay: i * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  ))}

                  {/* Perimeter Edges */}
                  <motion.polygon
                    points={nodes.map(n => `${n.x},${n.y}`).join(" ")}
                    fill="none"
                    stroke="#4338ca"
                    strokeWidth="0.25"
                    strokeDasharray="2 2"
                    initial={{ opacity: 0, rotate: -5 }}
                    animate={{ opacity: [0.1, 0.3, 0.1], rotate: 5 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
                    style={{ transformOrigin: "50px 50px" }}
                  />

                  {/* Outer Nodes / Vertices */}
                  {nodes.map((node, i) => (
                    <g key={`node-${i}`}>
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r="1.5"
                        fill="#818cf8"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 1, 0] }}
                        transition={{ 
                          duration: 2.5, 
                          delay: i * 0.15, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                      />
                      {/* Vertex Ping (Radar effect) */}
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r="4"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="0.5"
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ 
                          duration: 1.5, 
                          delay: (i * 0.15) + 0.5, 
                          repeat: Infinity, 
                          ease: "easeOut" 
                        }}
                      />
                    </g>
                  ))}

                  {/* Central Hub Core */}
                  <motion.circle
                    cx={center.x}
                    cy={center.y}
                    r="3.5"
                    fill="#e0e7ff"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  {/* Central Hub Spinning Ring */}
                  <motion.circle
                    cx={center.x}
                    cy={center.y}
                    r="8"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "50px 50px" }}
                  />
                  
                  {/* Central Hub Outer Pulsing Glow */}
                  <motion.circle
                    cx={center.x}
                    cy={center.y}
                    r="16"
                    fill="url(#centerGlow)"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              {/* Text & Progress */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold tracking-[0.3em] text-indigo-100 uppercase">
                    Impact Hub
                  </span>
                  <span className="text-[10px] tracking-widest text-indigo-400/80 uppercase font-mono">
                    Establishing Network
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="relative w-56 h-[2px] bg-indigo-950/40 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-white rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <motion.div 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.8)]" 
                  />
                  <span className="text-xs font-mono font-medium text-indigo-200 tabular-nums">
                    {progress}%
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </>
  );
}
