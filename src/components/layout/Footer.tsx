"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowUpRight, Sparkles, Heart } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Dashboard", href: "/login" },
    { label: "AI Engine", href: "/login" },
    { label: "Live Heatmap", href: "/login" },
    { label: "Volunteer Match", href: "/login" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Case Studies", href: "#impact" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
};

const socialLinks = [
  { icon: Mail, href: "#", label: "Email" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Top Gradient Divider */}
      <div className="section-divider" />

      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-foreground/[0.02] to-transparent blur-[100px] pointer-events-none" />

      <div className="relative z-10 pt-16 pb-8">
        <div className="container mx-auto px-6 max-w-7xl">

          {/* Newsletter CTA Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 p-8 rounded-2xl glass border border-foreground/[0.06] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/[0.03] via-transparent to-foreground/[0.03] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                  <Sparkles size={18} className="text-accent-muted" />
                  Stay in the loop
                </h3>
                <p className="text-sm text-accent-muted">Get updates on new features, case studies, and impact reports.</p>
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="flex-1 md:w-64 px-4 py-3 rounded-xl bg-foreground/[0.04] border border-foreground/[0.08] text-sm text-foreground placeholder:text-accent-dim focus:outline-none focus:border-foreground/20 focus:bg-foreground/[0.06] transition-all"
                />
                <button className="px-6 py-3 rounded-full border border-foreground/25 text-sm font-medium text-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all active:scale-[0.98] whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </motion.div>

          {/* Main Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            {/* Brand Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4 group cursor-pointer">
                <motion.div 
                  className="w-7 h-7"
                  whileHover={{ rotate: 360, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <img src="/logo1.png" alt="Impact Hub Logo" className="w-full h-full object-contain" />
                </motion.div>
                <span className="font-bold text-lg tracking-tight text-foreground">Impact Hub</span>
              </div>
              <p className="text-sm text-accent-muted leading-relaxed mb-6 max-w-xs">
                AI-powered resource allocation platform transforming crisis response through real-time intelligence and volunteer coordination.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-xl bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center text-accent-muted hover:text-foreground hover:bg-foreground/[0.08] hover:border-foreground/20 transition-all duration-300 group"
                  >
                    <social.icon size={15} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-dim mb-4">
                  {category}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group flex items-center gap-1 text-sm text-accent-muted hover:text-foreground transition-colors duration-300"
                      >
                        {link.label}
                        <ArrowUpRight
                          size={12}
                          className="opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-foreground/[0.04] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-accent-dim">
              © {new Date().getFullYear()} Impact Hub. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-accent-dim">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Security</Link>
            </div>
            <p className="text-xs text-accent-dim flex items-center gap-1.5">
              Built with <Heart size={10} className="text-foreground fill-foreground" /> for Hackathon Excellence
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
