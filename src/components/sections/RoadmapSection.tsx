"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bot, LineChart, Mic, BanknoteArrowUp, Brain, Smartphone } from "lucide-react";

export default function RoadmapSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-80%"]);

  const roadmapItems = [
     {
      icon: <BanknoteArrowUp className="w-9 h-9 text-foreground" />,
      title: "Volunteer & Earn",
      description: "Match unemployed youth with local NGO tasks to earn micro-stipends and verified skill credentials, turning idle potential into community impact at scale across India's 1.4 billion population.",
      q: "Q1 2026",
      gradient: "from-foreground/[0.06] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    },
    {
      icon: <Brain className="w-9 h-9 text-foreground" />,
      title: "Gemma AI Integration",
      description: "Deploy on-device Gemma models to process paper surveys offline in regional languages and intelligently match volunteer skills to community needs, even in rural zero-connectivity zones.",
      q: "Q2 2026",
      gradient: "from-foreground/[0.06] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    },
    {
      icon: <Smartphone className="w-9 h-9 text-foreground" />,
      title: "Flutter Cross-Platform App",
      description: "Build a single lightweight Flutter app accessible on any Android or iOS device, giving volunteers, NGOs, and field workers a seamless unified experience across India's fragmented device ecosystem.",
      q: "Q3 2026",
      gradient: "from-foreground/[0.06] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    },
    {
      icon: <Bot className="w-9 h-9 text-foreground" />,
      title: "Autonomous Command Agent",
      description: "AI that doesn't just suggest, but safely executes resource allocation based on real-time field constraints.",
      q: "Q4 2026",
      gradient: "from-foreground/[0.06] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    },
    {
      icon: <LineChart className="w-9 h-9 text-foreground" />,
      title: "Predictive Risk Forecasting",
      description: "Pre-position volunteers and supplies before the crisis peaks by analyzing historical incident data.",
      q: "Q1 2027",
      gradient: "from-foreground/[0.05] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    },
    {
      icon: <Mic className="w-9 h-9 text-foreground" />,
      title: "Voice Emergency Intake",
      description: "Multilingual voice-to-structured-data translation for instant reporting without internet or smartphones.",
      q: "Q2 2027",
      gradient: "from-foreground/[0.06] to-transparent",
      iconGlow: "group-hover:bg-foreground/[0.1] group-hover:border-foreground/20 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]",
    }
  ];

  return (
    <section id="roadmap" ref={targetRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">

        <div className="container mx-auto px-6 max-w-7xl w-full mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/[0.06] bg-foreground/[0.03] mb-5 text-xs font-medium text-accent-muted uppercase tracking-[0.15em]">
            Roadmap
          </div>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.03em] leading-tight mb-3">
            The Future of{" "}
            <span className="text-gradient-hero font-serif italic font-light">Response</span>
          </h2>
          <p className="text-accent-muted text-sm tracking-wide uppercase font-semibold">
            Powered by Firebase
          </p>
        </div>

        {/* Horizontal scroll container */}
        <div className="flex items-center w-full">
          <motion.div style={{ x }} className="flex gap-6 px-6 md:px-24">
            {roadmapItems.map((item, index) => (
              <div
                key={index}
                className={`w-[85vw] md:w-[550px] h-[340px] glass p-9 rounded-2xl flex flex-col justify-between relative group card-hover border border-foreground/[0.04] overflow-hidden`}
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="absolute top-0 right-0 p-7 text-5xl font-bold text-foreground/[0.03] group-hover:text-foreground/[0.08] transition-colors pointer-events-none tracking-tighter">
                  {item.q}
                </div>

                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-xl bg-foreground/[0.04] flex items-center justify-center mb-6 border border-foreground/[0.06] transition-all duration-500 ${item.iconGlow}`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-accent-muted leading-relaxed max-w-md">{item.description}</p>
                </div>

                <div className="relative z-10 flex items-center gap-3 text-xs font-medium text-accent-dim">
                  <span className="w-8 h-px bg-gradient-to-r from-gray-500 to-transparent" />
                  In Development
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
