"use client";

import { motion } from "framer-motion";
import AnimatedCounter from "../ui/AnimatedCounter";
import { Shield, Users, Building, MapPin, Info } from "lucide-react";

export default function ImpactSection() {
  const stats = [
    { value: 1000000, suffix: "+", label: "Lives Protected", delay: 0, icon: Shield },
    { value: 10000, suffix: "+", label: "Active Volunteers", delay: 0.1, icon: Users },
    { value: 500, suffix: "+", label: "Partner NGOs", delay: 0.2, icon: Building },
    { value: 100, suffix: "+", label: "Cities Covered", delay: 0.3, icon: MapPin },
  ];

  return (
    <section id="impact" className="py-16 md:py-20 relative">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/[0.06] bg-foreground/[0.03] mb-5 text-xs font-medium text-accent-muted uppercase tracking-[0.15em]">
            Projected Impact
          </div>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.03em] leading-tight mb-6">
            Our Vision for{" "}
            <span className="text-gradient-hero font-serif italic font-light">Production</span>
          </h2>
          <div className="relative group mt-2">
            <div className="absolute inset-0 bg-accent-muted/[0.03] rounded-2xl blur-md group-hover:bg-accent-muted/[0.08] transition-colors duration-500"></div>
            <div className="relative glass border border-accent-muted/[0.1] px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm">
              <Info className="w-5 h-5 text-accent-muted flex-shrink-0" />
              <p className="text-foreground/80 font-medium max-w-2xl text-sm md:text-base text-left">
                When ImpactHub is fully deployed and operational, here is what we aim to achieve within our first year of scaling globally.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: stat.delay }}
              className="glass rounded-2xl p-6 flex flex-col items-center justify-center text-center card-hover group"
            >
              <div className="text-accent-muted mb-4 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                <stat.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 font-mono text-foreground">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-accent-muted font-medium tracking-[0.1em] uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
