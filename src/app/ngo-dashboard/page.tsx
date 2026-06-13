"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, FileText, MapPin, Clock, CheckCircle2, Upload, Send, TrendingUp, Activity, Cpu, Sparkles, BrainCircuit, XCircle, Trash2, Users, Edit3, Eye, X } from "lucide-react";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/client";
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, 
  onSnapshot, deleteDoc, setDoc 
} from "firebase/firestore";

interface AIPreviewData {
  location: string;
  category: string;
  priority: string;
  affected_count: string;
  summary: string;
  recommended_action: string;
  resource_needed: string;
  volunteers_needed: string;
  confidence_score: number;
  ai_verified: boolean;
  credits_reward?: number;
}

function NGODashboardInner() {
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    volunteersActive: "0",
    avgResponse: "0m",
  });
  const [ngoCredits, setNgoCredits] = useState<number>(0);
  
  // Preview/Edit state
  const [previewData, setPreviewData] = useState<AIPreviewData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Inline Confirm states
  const [confirmingMissionId, setConfirmingMissionId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<any | null>(null);
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("q")?.toLowerCase() || "";
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    fetchData();
    
    // Set up realtime subscriptions
    const unsubscribeIncidents = onSnapshot(collection(db, "incidents"), () => {
      fetchData();
    });
    const unsubscribeExtractions = onSnapshot(collection(db, "nlp_extractions"), () => {
      fetchData();
    });
      
    return () => {
      unsubscribeIncidents();
      unsubscribeExtractions();
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch NGO profile to get credits
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        if (profileData.credits === undefined) {
          // Initialize credits
          await setDoc(doc(db, "profiles", user.uid), { credits: 50 }, { merge: true });
          setNgoCredits(50);
        } else {
          setNgoCredits(profileData.credits);
        }
      }

      // Fetch incidents for this user with deployed volunteers
      const incidentsQuery = query(
        collection(db, "incidents"),
        where("created_by", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(50)
      );
      const incSnap = await getDocs(incidentsQuery);
      
      const incList: any[] = [];
      const profileCache: { [key: string]: any } = {};

      for (const incidentDoc of incSnap.docs) {
        const inc = { id: incidentDoc.id, ...incidentDoc.data() } as any;
        
        // Fetch creator profile
        if (inc.created_by) {
          if (!profileCache[inc.created_by]) {
            const pSnap = await getDoc(doc(db, "profiles", inc.created_by));
            if (pSnap.exists()) {
              profileCache[inc.created_by] = pSnap.data();
            }
          }
          inc.profiles = profileCache[inc.created_by] || null;
        }

        // Fetch missions for this incident
        const missionsQuery = query(
          collection(db, "missions"),
          where("incident_id", "==", incidentDoc.id)
        );
        const mSnap = await getDocs(missionsQuery);
        const missionsList: any[] = [];

        for (const mDoc of mSnap.docs) {
          const mData = { id: mDoc.id, ...mDoc.data() } as any;
          
          // Fetch volunteer profile
          if (mData.volunteer_id) {
            if (!profileCache[mData.volunteer_id]) {
              const vpSnap = await getDoc(doc(db, "profiles", mData.volunteer_id));
              if (vpSnap.exists()) {
                profileCache[mData.volunteer_id] = vpSnap.data();
              }
            }
            mData.profiles = profileCache[mData.volunteer_id] || null;
          }
          missionsList.push(mData);
        }
        inc.missions = missionsList;
        incList.push(inc);
      }
      setIncidents(incList);

      // Fetch extractions for this user
      const extQuery = query(
        collection(db, "nlp_extractions"),
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(5)
      );
      const extSnap = await getDocs(extQuery);
      const extList = extSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExtractions(extList);
      
      // Fetch stats
      const missionsSnap = await getDocs(collection(db, "missions"));
      const activeMissions = missionsSnap.docs
        .map(doc => doc.data())
        .filter(m => m.status !== "Completed");
      const volunteersActive = new Set(activeMissions.map(m => m.volunteer_id)).size;
      
      // Calculate avg response
      const recentMissionsSnap = await getDocs(
        query(collection(db, "missions"), orderBy("created_at", "desc"), limit(20))
      );
      
      const recentMissionsList: any[] = [];
      for (const mDoc of recentMissionsSnap.docs) {
        const mData = { id: mDoc.id, ...mDoc.data() } as any;
        if (mData.incident_id) {
          const incDoc = await getDoc(doc(db, "incidents", mData.incident_id));
          if (incDoc.exists()) {
            mData.incident = incDoc.data();
          }
        }
        recentMissionsList.push(mData);
      }
      
      let avgResponseStr = "—";
      if (recentMissionsList.length > 0) {
        let total = 0;
        let count = 0;
        recentMissionsList.forEach((m: any) => {
          if (m.incident?.created_at && m.created_at) {
            const diff = (new Date(m.created_at).getTime() - new Date(m.incident.created_at).getTime()) / 60000;
            if (diff > 0 && diff < 1440) {
              total += diff;
              count++;
            }
          }
        });
        if (count > 0) avgResponseStr = `${(total / count).toFixed(1)}m`;
      }

      setStats({
        volunteersActive: volunteersActive.toString(),
        avgResponse: avgResponseStr,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (!searchQuery) return incidents;
    return incidents.filter(inc => 
      inc.location?.toLowerCase().includes(searchQuery) ||
      inc.description?.toLowerCase().includes(searchQuery) ||
      inc.type?.toLowerCase().includes(searchQuery)
    );
  }, [incidents, searchQuery]);

  // STEP 1: Send to AI for preview (does NOT save to database)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ text: reportText, preview_only: true })
      });
      
      const aiData = await response.json();
      
      if (response.ok && aiData.data) {
        // Show the editable preview modal
        setPreviewData({ ...aiData.data, credits_reward: 2 }); // Default 2 credits
      } else {
        setSubmitError(aiData.error || aiData.details || "AI processing failed. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting:", err);
      setSubmitError("Network error — check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Confirm and post (saves the edited data to database)
  const handleConfirmPost = async () => {
    if (!previewData) return;
    
    setIsConfirming(true);
    setSubmitError("");
    
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ 
          text: reportText, 
          edited_data: previewData
        })
      });
      
      const aiData = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
        setReportText("");
        setPreviewData(null);
        setTimeout(() => setSubmitted(false), 3000);
        fetchData();
      } else {
        setSubmitError(aiData.error || aiData.details || "Failed to post. Please try again.");
      }
    } catch (err) {
      console.error("Error confirming:", err);
      setSubmitError("Network error — check your connection and try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const approveMission = async (missionId: string, volunteerId: string) => {
    if (!user) return;
    try {
      // Fetch mission to get incident
      const missionSnap = await getDoc(doc(db, "missions", missionId));
      if (!missionSnap.exists()) return;
      const missionData = missionSnap.data();
      
      const incidentSnap = await getDoc(doc(db, "incidents", missionData.incident_id));
      if (!incidentSnap.exists()) return;
      const incidentData = incidentSnap.data();
      const reward = incidentData.credits_reward || 2; // Fallback to 2 for old incidents

      // Update mission status to Completed
      await setDoc(doc(db, "missions", missionId), { status: "Completed" }, { merge: true });

      if (reward > 0) {
        // Deduct from NGO
        const currentCredits = ngoCredits - reward;
        await setDoc(doc(db, "profiles", user!.uid), { credits: currentCredits }, { merge: true });
        setNgoCredits(currentCredits);

        // Add to Volunteer
        const volSnap = await getDoc(doc(db, "profiles", volunteerId));
        if (volSnap.exists()) {
          const volCredits = (volSnap.data().credits || 0) + reward;
          await setDoc(doc(db, "profiles", volunteerId), { credits: volCredits }, { merge: true });
        }

        // Log transaction
        const txRef = doc(collection(db, "credit_transactions"));
        await setDoc(txRef, {
          from_id: user!.uid,
          to_id: volunteerId,
          amount: reward,
          mission_id: missionId,
          created_at: new Date().toISOString()
        });
      }

      fetchData();
    } catch (error) {
      console.error("Error approving mission:", error);
    }
  };

  const deleteIncident = async (id: string) => {
    try {
      // Delete associated missions first
      const missionsQuery = query(collection(db, "missions"), where("incident_id", "==", id));
      const mSnap = await getDocs(missionsQuery);
      for (const mDoc of mSnap.docs) {
        await deleteDoc(mDoc.ref);
      }
      
      // Delete the incident
      await deleteDoc(doc(db, "incidents", id));
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error deleting incident:", error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <DashboardLayout role="ngo">
      <div className="p-6 md:p-8 max-w-7xl mx-auto font-helvetica space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">NGO Command Center</h1>
            <p className="text-sm text-accent-dim">Real-time resource allocation and automated AI report parsing.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-bold shadow-lg backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Sparkles size={12} />
              Impact Hub Credits: {ngoCredits} (= ₹{ngoCredits * 100})
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] text-xs text-foreground font-medium shadow-lg backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
              System Online
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 relative z-10">
          {[
            { label: "Active Reports", value: incidents.length.toString(), icon: FileText, trend: "Live Tracking" },
            { label: "AI Processed", value: extractions.length.toString(), icon: BrainCircuit, trend: "Entities Extracted" },
            { label: "Volunteers Active", value: stats.volunteersActive, icon: Activity, trend: "Currently Deployed" },
            { label: "Avg Response", value: stats.avgResponse, icon: Clock, trend: "Time to Deploy" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-foreground/[0.04] to-foreground/[0.01] border border-foreground/[0.08] hover:border-foreground/[0.15] transition-all duration-300 group overflow-hidden glass-panel"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={48} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-accent-dim font-bold uppercase tracking-widest">{stat.label}</span>
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-foreground/10 group-hover:scale-110 transition-transform">
                  <stat.icon size={14} className="text-foreground" />
                </div>
              </div>
              <div className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm">{stat.value}</div>
              <div className="text-xs text-accent-muted font-medium flex items-center gap-1.5">
                <TrendingUp size={12} className="text-green-400" />
                {stat.trend}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid xl:grid-cols-3 gap-8 relative z-10">
          {/* LEFT COL: AI Form & Extractions */}
          <div className="xl:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.04] to-transparent border border-foreground/[0.08] shadow-2xl glass-panel relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-foreground/10 blur-[50px] rounded-full pointer-events-none" />
              <h2 className="font-semibold mb-5 flex items-center gap-2 tracking-tight text-lg">
                <BrainCircuit size={18} className="text-accent-muted" />
                AI Field Reporter
                <Sparkles size={14} className="text-foreground ml-auto" />
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Enter raw field data. e.g. '500 people need water in Sector 7 due to flooding...'"
                    className="w-full h-32 px-4 py-3 rounded-xl bg-background/50 backdrop-blur-md border border-foreground/[0.1] text-sm text-foreground placeholder:text-accent-muted focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 resize-none transition-all shadow-inner font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !reportText.trim()}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-foreground/80 hover:shadow-[0_0_20px_var(--shimmer-c)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-background/20 border-t-black rounded-full" /> Analyzing with Gemini...</>
                  ) : submitted ? (
                    <><CheckCircle2 size={18} /> Analyzed & Dispatched</>
                  ) : (
                    <><Eye size={16} className="group-hover:scale-110 transition-transform" /> Analyze & Preview</>
                  )}
                </button>
              </form>

              {/* Error feedback */}
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2"
                  >
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-0.5">Analysis Failed</div>
                      {submitError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success feedback */}
              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Report analyzed by Gemini AI and logged to the incident feed.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* NLP Extractions Mini Feed */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] glass-panel"
            >
              <h3 className="font-semibold text-sm tracking-tight mb-4 flex items-center justify-between">
                <span>Recent AI Extractions</span>
                <span className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded uppercase tracking-widest">Self</span>
              </h3>
              <div className="space-y-3">
                {extractions.length === 0 ? (
                  <div className="text-xs text-accent-dim text-center py-4">
                    <BrainCircuit size={20} className="mx-auto mb-2 opacity-20" />
                    No AI extractions yet. Submit a field report above.
                  </div>
                ) : (
                  extractions.map((ext) => (
                    <div key={ext.id} className="p-3 rounded-lg border border-foreground/[0.04] bg-background/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-medium">{ext.extracted_data?.location || "Unknown"}</span>
                        <span className="text-[9px] text-accent-muted">{getTimeAgo(ext.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-foreground/[0.06] text-[9px] font-mono text-foreground/70">
                          {ext.extracted_data?.category}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${ext.extracted_data?.priority === 'CRITICAL' ? 'bg-foreground text-background' : 'bg-foreground/10 text-foreground'}`}>
                          {ext.extracted_data?.priority}
                        </span>
                        {ext.extracted_data?.confidence_score && (
                          <span className="px-1.5 py-0.5 rounded bg-foreground/[0.04] text-[9px] font-mono text-accent-dim">
                            {ext.extracted_data.confidence_score}% conf
                          </span>
                        )}
                      </div>
                      {ext.extracted_data?.summary && (
                        <div className="text-[10px] text-accent-dim line-clamp-2">{ext.extracted_data.summary}</div>
                      )}
                      <div className="text-[10px] text-accent-muted truncate">{ext.raw_text}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT COL: Live Incidents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="xl:col-span-2 rounded-2xl bg-gradient-to-b from-foreground/[0.03] to-background border border-foreground/[0.08] shadow-2xl overflow-hidden flex flex-col glass-panel"
          >
            <div className="p-6 border-b border-foreground/[0.06] flex justify-between items-center bg-foreground/[0.01]">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-lg">
                <AlertTriangle size={18} className="text-accent-muted" />
                Network Intelligence Feed
              </h2>
              <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-foreground/10">
                <span className="text-[10px] text-foreground font-mono font-bold tracking-widest">LIVE DATA</span>
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {loading ? (
                 <div className="h-64 flex flex-col items-center justify-center text-accent-dim text-sm space-y-4">
                   <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                   <span>Syncing global network...</span>
                 </div>
              ) : filteredIncidents.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-accent-dim text-sm">
                   <MapPin size={32} className="opacity-20 mb-3" />
                   <span>No active incidents detected.</span>
                   <span className="text-[11px] text-accent-dim mt-1">Submit a field report to create one.</span>
                 </div>
              ) : (
                <div className="space-y-2">
                  {filteredIncidents.map((need, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      key={need.id} 
                      className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl hover:bg-foreground/[0.04] border border-transparent hover:border-foreground/[0.06] transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-bold text-foreground">{need.location}</div>
                          <span className="text-[10px] text-accent-muted">• {getTimeAgo(need.created_at)}</span>
                          <span className="text-[10px] bg-foreground/5 text-accent-dim px-1.5 py-0.5 rounded ml-2">
                            Reported by: {need.profiles?.metadata?.orgName || need.profiles?.name || "Unknown NGO"}
                          </span>
                        </div>
                        <div className="text-sm text-accent-dim mb-2 line-clamp-1">{need.description}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider border ${
                            need.priority === "CRITICAL" ? "bg-foreground/10 text-foreground border-foreground/20" :
                            need.priority === "HIGH" ? "bg-foreground/[0.06] text-foreground/70 border-foreground/10" :
                            "bg-foreground/[0.03] text-accent-dim border-foreground/[0.06]"
                          }`}>
                            {need.priority}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-foreground/[0.03] border border-foreground/[0.06] text-[10px] font-medium text-accent-muted">
                            {need.type}
                          </span>
                          {need.affected && need.affected !== 'Unknown' && (
                            <span className="px-2 py-1 rounded-md bg-background border border-foreground/[0.04] text-[10px] font-mono text-accent-muted">
                              👥 {need.affected}
                            </span>
                          )}
                          {need.volunteers_needed > 0 && (
                            <span className={`px-2 py-1 rounded-md text-[10px] font-mono border ${
                              (need.missions?.length || 0) >= need.volunteers_needed 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                            }`}>
                              {need.missions?.filter((m: any) => m.status !== 'Completed').length || 0} / {need.volunteers_needed} Volunteers
                            </span>
                          )}
                        </div>
                        {/* Deployed Volunteers */}
                        {need.missions && need.missions.filter((m: any) => m.status !== 'Completed').length > 0 && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-foreground/[0.04]">
                            <div className="flex -space-x-2">
                              {need.missions.filter((m: any) => m.status !== 'Completed').slice(0, 4).map((m: any, mi: number) => (
                                m.profiles?.avatar_url ? (
                                  <img key={mi} src={m.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full border-2 border-background" />
                                ) : (
                                  <div key={mi} className="w-5 h-5 rounded-full bg-indigo-500/30 border-2 border-background flex items-center justify-center">
                                    <Users size={8} className="text-indigo-400" />
                                  </div>
                                )
                              ))}
                            </div>
                            <span className="text-[10px] text-indigo-400 font-medium">
                              {need.missions.filter((m: any) => m.status !== 'Completed').map((m: any) => 
                                m.profiles?.metadata?.full_name || m.profiles?.name || 'Volunteer'
                              ).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="sm:text-right flex flex-row sm:flex-col justify-between items-center sm:items-end gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-background border border-foreground/10">
                          {need.status === "Processing" && <><Cpu size={12} className="animate-spin text-accent-muted" />Processing</>}
                          {need.status === "Dispatched" && <><div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />Dispatched</>}
                          {need.status === "Active" && <><Activity size={12} className="text-accent-muted" />Active</>}
                          {need.status === "In Transit" && <><div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />In Transit</>}
                          {need.status === "Resolved" && <><CheckCircle2 size={12} className="text-green-500" />Resolved</>}
                        </span>
                        
                        {/* Approve missions logic */}
                        {need.missions && need.missions.some((m: any) => m.status === 'Pending Approval') && (
                          <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-foreground/[0.04]">
                            {need.missions.filter((m: any) => m.status === 'Pending Approval').map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between sm:justify-end gap-2 bg-foreground/[0.02] p-1.5 rounded-lg border border-foreground/[0.04]">
                                <span className="text-[10px] text-accent-dim mr-auto pl-1 sm:hidden">
                                  {m.profiles?.name || 'Volunteer'} pending
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setViewingProof(m); }}
                                  className="flex items-center gap-1 text-[10px] text-accent-dim hover:text-foreground px-2 py-1.5 rounded-lg border border-foreground/[0.08] hover:bg-foreground/5 transition-all font-medium"
                                  title="View Proof of Work"
                                >
                                  <FileText size={11} /> Proof
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (confirmingMissionId === m.id) {
                                      approveMission(m.id, m.volunteer_id);
                                      setConfirmingMissionId(null);
                                    } else {
                                      setConfirmingMissionId(m.id);
                                    }
                                  }}
                                  onMouseLeave={() => setConfirmingMissionId(null)}
                                  className={`flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg border transition-all font-bold ${
                                    confirmingMissionId === m.id 
                                      ? "bg-green-500 text-background border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" 
                                      : "text-green-400 hover:bg-green-500/10 border-green-500/20"
                                  }`}
                                >
                                  <CheckCircle2 size={11} /> 
                                  {confirmingMissionId === m.id ? "Confirm Transfer?" : `Approve ${m.profiles?.name || 'Volunteer'}`}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirmingDeleteId === need.id) {
                              deleteIncident(need.id);
                              setConfirmingDeleteId(null);
                            } else {
                              setConfirmingDeleteId(need.id);
                            }
                          }}
                          onMouseLeave={() => setConfirmingDeleteId(null)}
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                            confirmingDeleteId === need.id 
                              ? "bg-red-500 text-background border-red-500 font-bold shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
                              : "text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20"
                          }`}
                          title="Delete Incident"
                        >
                          <Trash2 size={11} /> 
                          {confirmingDeleteId === need.id ? "Are you sure?" : "Delete"}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* === AI BRIEFING PREVIEW MODAL === */}
      <AnimatePresence>
        {previewData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => { setPreviewData(null); setSubmitError(""); }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#18181b] to-[#0f0f12] border border-foreground/[0.1] shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4 border-b border-foreground/[0.08] bg-[#18181b]/95 backdrop-blur-xl rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                    <BrainCircuit size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">AI Briefing Preview</h3>
                    <p className="text-[10px] text-accent-dim">Review & edit before posting to the incident feed</p>
                  </div>
                </div>
                <button
                  onClick={() => { setPreviewData(null); setSubmitError(""); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-foreground/10 transition-colors"
                >
                  <X size={16} className="text-accent-dim" />
                </button>
              </div>

              {/* Confidence Badge */}
              <div className="px-5 pt-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                  previewData.ai_verified
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  <Sparkles size={12} />
                  AI Confidence: {previewData.confidence_score}% — {previewData.ai_verified ? "Auto-Verified" : "Needs Review"}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="p-5 space-y-4">
                {/* Summary */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Summary</label>
                  <textarea
                    value={previewData.summary}
                    onChange={(e) => setPreviewData({ ...previewData, summary: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 resize-none transition-all h-20 font-mono"
                  />
                </div>

                {/* Location + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">
                      <MapPin size={10} className="inline mr-1" />Location
                    </label>
                    <input
                      type="text"
                      value={previewData.location}
                      onChange={(e) => setPreviewData({ ...previewData, location: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      value={previewData.category}
                      onChange={(e) => setPreviewData({ ...previewData, category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all appearance-none cursor-pointer"
                    >
                      {["Water", "Medical", "Food", "Shelter", "Evacuation", "Infrastructure", "Other"].map(c => (
                        <option key={c} value={c} className="bg-background">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority + Affected row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">
                      <AlertTriangle size={10} className="inline mr-1" />Priority
                    </label>
                    <select
                      value={previewData.priority}
                      onChange={(e) => setPreviewData({ ...previewData, priority: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all appearance-none cursor-pointer"
                    >
                      {["CRITICAL", "HIGH", "NORMAL"].map(p => (
                        <option key={p} value={p} className="bg-background">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">
                      <Users size={10} className="inline mr-1" />Affected
                    </label>
                    <input
                      type="text"
                      value={previewData.affected_count}
                      onChange={(e) => setPreviewData({ ...previewData, affected_count: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                  </div>
                </div>

                {/* Resource Needed */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Resource Needed</label>
                  <input
                    type="text"
                    value={previewData.resource_needed}
                    onChange={(e) => setPreviewData({ ...previewData, resource_needed: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                  />
                </div>

                {/* Recommended Action */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Recommended Action</label>
                  <textarea
                    value={previewData.recommended_action}
                    onChange={(e) => setPreviewData({ ...previewData, recommended_action: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 resize-none transition-all h-16 font-mono"
                  />
                </div>

                {/* Volunteers Needed & Credits Reward */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Volunteers Needed</label>
                    <input
                      type="number"
                      value={previewData.volunteers_needed}
                      onChange={(e) => setPreviewData({ ...previewData, volunteers_needed: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Credits per Vol. (₹100/cr)</label>
                    <input
                      type="number"
                      value={previewData.credits_reward || 0}
                      onChange={(e) => setPreviewData({ ...previewData, credits_reward: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-indigo-400 font-bold focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      min="0"
                    />
                  </div>
                </div>

                {/* Error */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 flex items-center gap-3 p-5 pt-4 border-t border-foreground/[0.08] bg-[#0f0f12]/95 backdrop-blur-xl rounded-b-2xl">
                <button
                  onClick={() => { setPreviewData(null); setSubmitError(""); }}
                  className="flex-1 h-11 rounded-xl border border-foreground/[0.1] text-sm font-medium text-accent-dim hover:text-foreground hover:bg-foreground/[0.05] transition-all flex items-center justify-center gap-2"
                >
                  <X size={14} /> Discard
                </button>
                <button
                  onClick={handleConfirmPost}
                  disabled={isConfirming}
                  className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {isConfirming ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> Dispatching...</>
                  ) : (
                    <><Send size={14} /> Confirm & Dispatch</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PROOF MODAL === */}
      <AnimatePresence>
        {viewingProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingProof(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              onClick={(e) => e.stopPropagation()} 
              className="relative w-full max-w-md bg-background border border-foreground/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-foreground/[0.08] bg-foreground/[0.02]">
                <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                  <FileText size={18} className="text-accent-muted" /> Proof of Work
                </h3>
                <button
                  onClick={() => setViewingProof(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-foreground/10 transition-colors"
                >
                  <X size={16} className="text-accent-dim" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  {viewingProof.profiles?.avatar_url ? (
                    <img src={viewingProof.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full border border-foreground/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <Users size={16} className="text-indigo-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{viewingProof.profiles?.name || viewingProof.profiles?.metadata?.full_name || 'Volunteer'}</div>
                    <div className="text-[10px] text-accent-dim tracking-widest uppercase font-bold">Submitted Proof</div>
                  </div>
                </div>

                <div className="bg-foreground/[0.03] border border-foreground/[0.08] rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap font-mono min-h-[100px] break-words">
                  {viewingProof.proof_text || <span className="text-accent-muted italic">No text provided.</span>}
                </div>

                {viewingProof.proof_url && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-foreground/10 bg-black">
                    <img src={viewingProof.proof_url} alt="Proof of work" className="w-full max-h-[300px] object-contain" />
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button onClick={() => setViewingProof(null)} className="flex-1 h-11 rounded-xl bg-foreground/[0.04] text-sm font-medium hover:bg-foreground/[0.08] transition-all">Close</button>
                  <button 
                    onClick={() => {
                      approveMission(viewingProof.id, viewingProof.volunteer_id);
                      setViewingProof(null);
                    }}
                    className="flex-[2] h-11 rounded-xl bg-green-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    <CheckCircle2 size={16} /> Approve Now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}

export default function NGODashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <NGODashboardInner />
    </Suspense>
  );
}
