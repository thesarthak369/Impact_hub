"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, AlertTriangle, CheckCircle2, X, Users,
  Filter, Search, ChevronDown, Activity, Cpu, Navigation2,
  Shield, Sparkles, Eye, ArrowRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, getDocs, onSnapshot } from "firebase/firestore";

interface Incident {
  id: string;
  location: string;
  type: string;
  priority: string;
  status: string;
  affected: string;
  description: string;
  created_at: string;
  created_by: string | null;
  ngo_name?: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [stats, setStats] = useState({ total: 0, critical: 0, active: 0, resolved: 0 });
  useEffect(() => {
    const q = query(collection(db, "incidents"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      
      // Sort docs by created_at descending in JS
      docs.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      // Fetch NGO names separately
      const creatorIds = [...new Set(docs.filter(d => d.created_by).map(d => d.created_by))];
      let ngoMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        try {
          const profilesSnap = await getDocs(collection(db, "profiles"));
          profilesSnap.docs.forEach(docSnap => {
            const p = docSnap.data();
            if (p.role === "ngo" && creatorIds.includes(docSnap.id)) {
              ngoMap[docSnap.id] = p.name || p.metadata?.orgName || 'Unknown NGO';
            }
          });
        } catch (err) {
          console.error("Error fetching creator profiles:", err);
        }
      }

      const mapped = docs.map((d: any) => ({ ...d, ngo_name: d.created_by ? (ngoMap[d.created_by] || null) : null }));
      setIncidents(mapped);
      setStats({
        total: mapped.length,
        critical: mapped.filter((i: any) => i.priority === 'CRITICAL').length,
        active: mapped.filter((i: any) => i.status !== 'Resolved').length,
        resolved: mapped.filter((i: any) => i.status === 'Resolved').length,
      });
      setLoading(false);
    }, (error) => {
      console.error("Incidents snapshot error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getTimeAgo = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const m = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const filtered = incidents.filter(i => {
    const matchesFilter = filter === "all" || i.priority === filter || i.status === filter;
    const matchesSearch = !search ||
      i.location.toLowerCase().includes(search.toLowerCase()) ||
      i.type?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const priorityStyle = (p: string) => {
    if (p === "CRITICAL") return "bg-red-500/15 text-red-400 border-red-500/25";
    if (p === "HIGH") return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  };

  const statusStyle = (s: string) => {
    if (s === "Resolved") return "text-emerald-400";
    if (s === "In Transit") return "text-amber-400";
    return "text-foreground";
  };

  return (
    <DashboardLayout role="volunteer">
      <div className="p-6 md:p-8 max-w-7xl mx-auto font-helvetica space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-1">
              Incident Explorer
            </h1>
            <p className="text-sm text-accent-dim">All active and resolved incidents across India — click any card for details.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] text-xs text-foreground font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Real-time from Firestore
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Critical", value: stats.critical, color: "text-red-400" },
            { label: "Active", value: stats.active, color: "text-amber-400" },
            { label: "Resolved", value: stats.resolved, color: "text-emerald-400" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-accent-dim uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
            <input
              type="text"
              placeholder="Search by location, type, or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl text-sm focus:outline-none focus:border-foreground/15 text-foreground/70 placeholder:text-accent-dim transition-all"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["all", "CRITICAL", "HIGH", "NORMAL", "Resolved"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f ? "bg-foreground text-background" : "text-accent-dim hover:text-foreground bg-foreground/[0.03] border border-foreground/[0.06]"
                }`}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>

        {/* Incident Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-accent-dim text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <span>Loading incidents across India...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-accent-dim text-sm">
            <AlertTriangle size={32} className="opacity-20 mb-3" />
            <span>No incidents match your filters.</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((inc, i) => (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedIncident(inc)}
                className="group p-5 rounded-2xl bg-gradient-to-b from-foreground/[0.04] to-foreground/[0.01] border border-foreground/[0.06] hover:border-foreground/[0.15] transition-all cursor-pointer hover:shadow-lg relative overflow-hidden"
              >
                {/* Priority stripe */}
                <div className={`absolute top-0 left-0 w-full h-[2px] ${
                  inc.priority === "CRITICAL" ? "bg-red-500/60" :
                  inc.priority === "HIGH" ? "bg-amber-500/60" : "bg-emerald-500/60"
                }`} />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-foreground text-lg group-hover:text-white transition-colors">{inc.location}</div>
                    <div className="text-xs text-accent-dim mt-0.5">{inc.type || "General"}</div>
                    {inc.ngo_name && <div className="text-[10px] text-indigo-400 mt-0.5">📋 {inc.ngo_name}</div>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${priorityStyle(inc.priority)}`}>
                    {inc.priority}
                  </span>
                </div>

                {inc.description && (
                  <p className="text-xs text-accent-dim leading-relaxed mb-3 line-clamp-2">{inc.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-accent-dim">
                    <span className="flex items-center gap-1"><Users size={10} /> {inc.affected || "?"} affected</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {getTimeAgo(inc.created_at)}</span>
                  </div>
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${statusStyle(inc.status)}`}>
                    {inc.status === "Resolved" ? <CheckCircle2 size={10} /> : inc.status === "In Transit" ? <Navigation2 size={10} /> : <Activity size={10} className="animate-pulse" />}
                    {inc.status}
                  </span>
                </div>

                {/* Hover reveal */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[9px] text-accent-muted flex items-center gap-1"><Eye size={10} /> View Details</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div 
              className="fixed inset-0 overflow-y-auto"
              onClick={() => setSelectedIncident(null)}
            >
              <div className="flex min-h-full items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-background border border-foreground/10 rounded-2xl shadow-2xl my-8 overflow-hidden"
                >
              {/* Priority bar */}
              <div className={`h-1 w-full shrink-0 ${
                selectedIncident.priority === "CRITICAL" ? "bg-red-500/60" :
                selectedIncident.priority === "HIGH" ? "bg-amber-500/60" : "bg-emerald-500/60"
              }`} />

              <div className="p-6 overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight mb-1">{selectedIncident.location}</h2>
                    <div className="flex items-center gap-2 text-xs text-accent-dim">
                      <span>{selectedIncident.type || "General"}</span>
                      <span>•</span>
                      <span>{getTimeAgo(selectedIncident.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="w-8 h-8 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center text-accent-dim hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                    <div className={`text-sm font-bold ${selectedIncident.priority === "CRITICAL" ? "text-red-400" : selectedIncident.priority === "HIGH" ? "text-amber-400" : "text-emerald-400"}`}>{selectedIncident.priority}</div>
                    <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Priority</div>
                  </div>
                  <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                    <div className="text-sm font-bold">{selectedIncident.affected || "Unknown"}</div>
                    <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Affected</div>
                  </div>
                  <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                    <div className={`text-sm font-bold ${statusStyle(selectedIncident.status)}`}>{selectedIncident.status}</div>
                    <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Status</div>
                  </div>
                </div>

                {/* Description */}
                {selectedIncident.description && (
                  <div className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] mb-5">
                    <div className="text-[10px] text-accent-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles size={10} className="text-foreground" /> AI-Generated Summary
                    </div>
                    <p className="text-sm text-accent-muted leading-relaxed">{selectedIncident.description}</p>
                  </div>
                )}

                {/* Incident metadata */}
                <div className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] space-y-2.5 mb-5">
                  <div className="flex justify-between text-xs">
                    <span className="text-accent-dim">Location</span>
                    <span className="text-foreground font-medium flex items-center gap-1"><MapPin size={11} /> {selectedIncident.location}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                    <span className="text-accent-dim">Category</span>
                    <span className="text-foreground font-medium">{selectedIncident.type || "General"}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                    <span className="text-accent-dim">Reported By</span>
                    <span className="text-indigo-400 font-medium">{selectedIncident.ngo_name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                    <span className="text-accent-dim">Reported</span>
                    <span className="text-foreground font-medium">{new Date(selectedIncident.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Close */}
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-full h-11 rounded-xl bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-accent-muted hover:text-foreground transition-colors font-medium"
                >
                  Close
                </button>
              </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
