"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  BrainCircuit, AlertTriangle, Zap, HeartHandshake,
  CheckCircle2, Sparkles, MapPin, Clock, Shield,
  Target, Radio, Navigation2, ArrowRight, Users, Eye
} from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";

interface MatchedMission {
  id: string;
  incident_id: string;
  incident_location: string;
  incident_type: string;
  incident_priority: string;
  incident_affected: string;
  incident_description: string;
  status: string;
  assigned_role: string;
  created_at: string;
}

export default function AIEngineBriefingPage() {
  const [matchedMissions, setMatchedMissions] = useState<MatchedMission[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchMyMissions() {
      if (!user) { setLoading(false); return; }

      try {
        // Fetch missions
        const missionsQ = query(
          collection(db, "missions"),
          where("volunteer_id", "==", user.uid)
        );
        const missionsSnap = await getDocs(missionsQ);
        const missionsRaw = missionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        // Sort missions by created_at desc in JS
        missionsRaw.sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });

        // Resolve incident links
        const missionsWithIncidents = await Promise.all(missionsRaw.slice(0, 20).map(async (m: any) => {
          if (!m.incident_id) return { ...m, incident: null };
          const incSnap = await getDoc(doc(db, "incidents", m.incident_id));
          return {
            ...m,
            incident: incSnap.exists() ? { id: incSnap.id, ...incSnap.data() } : null
          };
        }));

        const mapped: MatchedMission[] = missionsWithIncidents.map((m: any) => ({
          id: m.id,
          incident_id: m.incident_id,
          incident_location: m.incident?.location || "Unknown",
          incident_type: m.incident?.type || "General",
          incident_priority: m.incident?.priority || "NORMAL",
          incident_affected: m.incident?.affected || "Unknown",
          incident_description: m.incident?.description || "",
          status: m.status,
          assigned_role: m.assigned_role || "Field Responder",
          created_at: m.created_at,
        }));
        setMatchedMissions(mapped);

        // Fetch notifications
        const notifsQ = query(
          collection(db, "notifications"),
          where("user_id", "==", user.uid)
        );
        const notifsSnap = await getDocs(notifsQ);
        const notifsRaw = notifsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((n: any) => n.type === "ai" && n.read === false);
        
        notifsRaw.sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });

        setAiSuggestions(notifsRaw.slice(0, 5));
      } catch (err) {
        console.error("Error loading missions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyMissions();
  }, [user]);

  const markMissionInProgress = async (missionId: string, incidentId: string) => {
    await updateDoc(doc(db, "missions", missionId), { status: "In Progress" });
    await updateDoc(doc(db, "incidents", incidentId), { status: "In Transit" });
    setMatchedMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'In Progress' } : m));
  };

  const completeMission = async (missionId: string, incidentId: string) => {
    await updateDoc(doc(db, "missions", missionId), { status: "Completed" });
    await updateDoc(doc(db, "incidents", incidentId), { status: "Resolved" });
    setMatchedMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'Completed' } : m));
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const priorityStyle = (p: string) => {
    if (p === "CRITICAL") return "bg-red-500/15 text-red-400 border-red-500/25";
    if (p === "HIGH") return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  };

  const activeCount = matchedMissions.filter(m => m.status !== 'Completed').length;
  const completedCount = matchedMissions.filter(m => m.status === 'Completed').length;

  return (
    <DashboardLayout role="volunteer">
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-helvetica space-y-6">
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-accent-muted" />
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              AI Briefing
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-foreground/10 border border-foreground/15 text-[10px] font-bold tracking-wider text-foreground ml-2">
              VOLUNTEER VIEW
            </span>
          </div>
          <p className="text-sm text-accent-dim max-w-2xl">
            Your AI-powered mission control — see what&apos;s assigned, take action, and track your impact.
          </p>
        </div>

        {/* Compact pipeline strip */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] flex items-center gap-2 overflow-x-auto">
          {[
            { icon: Radio, label: "Report" },
            { icon: BrainCircuit, label: "NLP Extract" },
            { icon: AlertTriangle, label: "Priority" },
            { icon: MapPin, label: "Geo Map" },
            { icon: HeartHandshake, label: "Match You" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              {i > 0 && <ArrowRight size={10} className="text-accent-dim" />}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                <s.icon size={12} className="text-accent-muted" />
                <span className="text-[10px] font-medium text-accent-dim whitespace-nowrap">{s.label}</span>
              </div>
            </div>
          ))}
          <div className="ml-auto shrink-0 text-[9px] text-accent-dim font-mono tracking-wider">GEMINI AI PIPELINE</div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active Missions", value: activeCount, color: "text-amber-400" },
            { label: "Completed", value: completedCount, color: "text-emerald-400" },
            { label: "AI Suggestions", value: aiSuggestions.length, color: "text-indigo-400" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-accent-dim uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/15">
            <h2 className="font-semibold mb-3 flex items-center gap-2 tracking-tight">
              <BrainCircuit size={16} className="text-indigo-400" />
              AI Matched You
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">{aiSuggestions.length} NEW</span>
            </h2>
            <div className="space-y-2">
              {aiSuggestions.map((sug, i) => (
                <motion.div key={sug.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                  className="p-3.5 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <BrainCircuit size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground mb-0.5">{sug.title}</div>
                    <p className="text-xs text-accent-dim leading-relaxed line-clamp-2">{sug.body}</p>
                    <div className="text-[10px] text-accent-dim mt-1">{getTimeAgo(sug.created_at)}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Your AI-Matched Missions — main focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-gradient-to-b from-foreground/[0.03] to-background border border-foreground/[0.08] shadow-2xl overflow-hidden glass-panel"
        >
          <div className="p-5 border-b border-foreground/[0.06] flex justify-between items-center bg-foreground/[0.01]">
            <h2 className="font-semibold tracking-tight flex items-center gap-2 text-lg">
              <HeartHandshake size={18} className="text-accent-muted" />
              Your Missions
              <span className="text-[10px] font-mono text-accent-dim ml-1">({matchedMissions.length} total)</span>
            </h2>
            <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-foreground/10">
              <span className="text-[10px] text-foreground font-mono font-bold tracking-widest">LIVE</span>
              <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="h-40 flex flex-col items-center justify-center text-accent-dim text-sm space-y-3">
                <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                <span>Loading your missions...</span>
              </div>
            ) : matchedMissions.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-accent-dim text-sm">
                <HeartHandshake size={32} className="opacity-20 mb-3" />
                <span>No missions assigned yet.</span>
                <span className="text-[11px] text-accent-dim mt-1">Go to your Dashboard to deploy on active incidents.</span>
                <Link href="/volunteer-dashboard" className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/80 transition-colors flex items-center gap-1.5">
                  <ArrowRight size={12} /> Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {matchedMissions.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-5 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] hover:border-foreground/[0.12] transition-all"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-foreground text-lg mb-0.5">{m.incident_location}</div>
                        <div className="text-xs text-accent-dim flex items-center gap-2">
                          <span>{m.incident_type}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Users size={10} /> {m.incident_affected} affected</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${priorityStyle(m.incident_priority)}`}>
                          {m.incident_priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${
                          m.status === "Completed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          m.status === "In Progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-foreground/[0.04] text-accent-muted border-foreground/[0.08]"
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {m.incident_description && (
                      <p className="text-xs text-accent-dim leading-relaxed mb-3">{m.incident_description}</p>
                    )}

                    {/* Your Role */}
                    <div className="p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.04] mb-3">
                      <div className="text-[10px] text-accent-dim uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Target size={10} /> Your Assigned Role
                      </div>
                      <div className="text-sm font-semibold text-foreground">{m.assigned_role}</div>
                    </div>

                    {/* Meta + Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-accent-dim">
                        <span className="flex items-center gap-1"><Clock size={10} /> {getTimeAgo(m.created_at)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {m.status === "Assigned" && (
                          <button
                            onClick={() => markMissionInProgress(m.id, m.incident_id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1"
                          >
                            <Navigation2 size={10} /> Start Mission
                          </button>
                        )}
                        {m.status === "In Progress" && (
                          <button
                            onClick={() => completeMission(m.id, m.incident_id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 size={10} /> Mark Complete
                          </button>
                        )}
                        {m.status === "Completed" && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/5 text-emerald-500/60 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Done
                          </span>
                        )}
                        <Link href="/live-map"
                          className="px-3 py-1.5 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-accent-dim text-[10px] font-bold hover:text-foreground hover:border-foreground/15 transition-all flex items-center gap-1">
                          <MapPin size={10} /> View on Map
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
