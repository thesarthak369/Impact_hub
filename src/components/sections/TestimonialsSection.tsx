"use client";

import { motion } from "framer-motion";
import { Play, Quote, User } from "lucide-react";

export default function TestimonialsSection() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-foreground/5 bg-background">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-accent-muted/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-foreground/5 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/10 bg-foreground/[0.02] mb-4 shadow-[0_0_15px_var(--glow-color)]"
          >
            <Quote size={12} className="text-accent-muted" />
            <span className="text-[10px] font-semibold text-foreground/70 tracking-[0.2em] uppercase">Testimonials</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
          >
            Real <span className="font-serif italic font-light text-gradient">Impact.</span> Real Stories.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-foreground/60 max-w-2xl mx-auto text-sm md:text-base"
          >
            Hear from the volunteers and organizers who have experienced the power of unified emergency response firsthand.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Video Testimonial - Left Side (Spans 7 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col h-full"
          >
            <div className="relative group overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/5 shadow-2xl aspect-video w-full flex-grow flex items-center justify-center cursor-pointer transition-all duration-500 hover:border-foreground/20 hover:shadow-[0_0_40px_var(--glow-color)]">
              {/* NOTE: Placeholder for video. Once color graded, add src attribute to the video tag below and remove placeholder UI */}
              
              <div className="absolute inset-0 bg-gradient-to-tr from-foreground/10 to-transparent pointer-events-none" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="w-16 h-16 rounded-full bg-foreground/10 backdrop-blur-md flex items-center justify-center border border-foreground/20 mb-4 group-hover:bg-foreground/20 transition-colors duration-300 shadow-[0_0_20px_var(--glow-color)]">
                  <Play className="w-6 h-6 text-foreground ml-1" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Video Testimonial Space</h3>
                <p className="text-sm text-foreground/50 max-w-md">
                  (Placeholder: Upload your color-graded video here. Replace this block with your video tag or component.)
                </p>
              </div>

              {/* Video Element - Hidden for now until src is provided */}
              {/* 
              <video 
                className="absolute inset-0 w-full h-full object-cover"
                controls
                playsInline
                src="/path/to/your/color-graded-video.mp4" 
              >
                Your browser does not support the video tag.
              </video> 
              */}
            </div>
            <div className="mt-6 px-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-lg">Dr. Ananya Sharma</h4>
                <p className="text-sm text-accent-muted">Chief Medical Officer, Crisis Relief Network</p>
              </div>
              <div className="text-xs text-foreground/40 font-mono tracking-widest uppercase">
                Featured Story
              </div>
            </div>
          </motion.div>

          {/* Text Testimonials Grid - Right Side (Spans 5 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* Testimonial Card 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Quote size={40} />
              </div>
              <div className="flex gap-1 text-accent-muted mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-foreground/80 italic text-sm mb-6 leading-relaxed">
                "The unified dashboard changed everything during the monsoon floods. We coordinated 50+ volunteers in minutes instead of hours. The offline SMS fallback was a literal lifesaver when cell towers went down."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-foreground/20">
                  <User className="w-5 h-5 text-foreground/60" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm">Rahul Verma</h5>
                  <p className="text-xs text-foreground/50">Field Organizer, Kerala</p>
                </div>
              </div>
            </div>

            {/* Testimonial Card 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-colors shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Quote size={40} />
              </div>
              <div className="flex gap-1 text-accent-muted mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-foreground/80 italic text-sm mb-6 leading-relaxed">
                "Finally, a platform that doesn't just collect data, but makes it actionable. The real-time mapping of resources to needs has significantly optimized our response times across the district."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-foreground/20">
                  <User className="w-5 h-5 text-foreground/60" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm">Priya Desai</h5>
                  <p className="text-xs text-foreground/50">NGO Director, Mumbai</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
