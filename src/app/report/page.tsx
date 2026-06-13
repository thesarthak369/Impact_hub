"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Sparkles, Send, Eye, XCircle, CheckCircle2, MapPin, AlertTriangle, Users, X, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/client";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

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

export default function UserReportPage() {
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [extractions, setExtractions] = useState<any[]>([]);
  
  // Preview/Edit state
  const [previewData, setPreviewData] = useState<AIPreviewData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchMyReports();
  }, [user]);

  const fetchMyReports = async () => {
    if (!user) return;
    try {
      const extQuery = query(
        collection(db, "nlp_extractions"),
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(10)
      );
      const extSnap = await getDocs(extQuery);
      setExtractions(extSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

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
        setPreviewData({ ...aiData.data, credits_reward: 2 });
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
          edited_data: {
            ...previewData,
            credits_reward: 0
          } 
        })
      });
      
      const aiData = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
        setReportText("");
        setPreviewData(null);
        setTimeout(() => setSubmitted(false), 3000);
        fetchMyReports();
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
    <DashboardLayout role="volunteer">
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-helvetica space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Report an Incident</h1>
          <p className="text-sm text-accent-dim">Submit raw field observations. Our AI will structure the data and deploy it to the network.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.04] to-transparent border border-foreground/[0.08] shadow-2xl glass-panel relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
            <h2 className="font-semibold mb-5 flex items-center gap-2 tracking-tight text-lg">
              <BrainCircuit size={18} className="text-indigo-400" />
              AI Field Reporter
              <Sparkles size={14} className="text-foreground ml-auto" />
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Enter raw field data. e.g. '500 people need water in Sector 7 due to flooding...'"
                  className="w-full h-40 px-4 py-3 rounded-xl bg-background/50 backdrop-blur-md border border-foreground/[0.1] text-sm text-foreground placeholder:text-accent-muted focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-all shadow-inner font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !reportText.trim()}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> Analyzing with Gemini...</>
                ) : submitted ? (
                  <><CheckCircle2 size={18} /> Analyzed & Dispatched</>
                ) : (
                  <><Eye size={16} className="group-hover:scale-110 transition-transform" /> Analyze Report</>
                )}
              </button>
            </form>

            <AnimatePresence>
              {submitError && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                  <XCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-0.5">Analysis Failed</div>
                    {submitError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {submitted && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Report analyzed and logged successfully!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Past Reports */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] glass-panel"
          >
            <h3 className="font-semibold text-lg tracking-tight mb-4 flex items-center gap-2">
              <Clock size={18} className="text-accent-muted" />
              My Past Reports
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
              {extractions.length === 0 ? (
                <div className="text-sm text-accent-dim text-center py-8 border border-foreground/[0.04] rounded-xl border-dashed">
                  <BrainCircuit size={24} className="mx-auto mb-3 opacity-20" />
                  No reports submitted yet.
                </div>
              ) : (
                extractions.map((ext) => (
                  <div key={ext.id} className="p-4 rounded-xl border border-foreground/[0.04] bg-background/50 hover:border-foreground/[0.08] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-foreground">{ext.extracted_data?.location || "Unknown"}</span>
                      <span className="text-[10px] text-accent-muted">{getTimeAgo(ext.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-foreground/[0.06] text-[10px] font-mono text-foreground/70">
                        {ext.extracted_data?.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${
                        ext.extracted_data?.priority === 'CRITICAL' ? 'bg-foreground text-background border-foreground' : 
                        'bg-foreground/10 text-foreground border-foreground/20'
                      }`}>
                        {ext.extracted_data?.priority}
                      </span>
                    </div>
                    {ext.extracted_data?.summary && (
                      <div className="text-xs text-accent-dim mb-2 line-clamp-2">{ext.extracted_data.summary}</div>
                    )}
                    <div className="text-[10px] text-accent-muted truncate bg-foreground/[0.02] p-2 rounded border border-foreground/[0.04]">
                      <span className="font-bold text-foreground/40 mr-1">RAW:</span>{ext.raw_text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Preview Modal */}
      <AnimatePresence>
        {previewData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setPreviewData(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-background border border-foreground/10 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-foreground/[0.08] bg-background/95 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <BrainCircuit size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">AI Briefing Preview</h3>
                    <p className="text-[10px] text-accent-dim">Review & edit before submitting</p>
                  </div>
                </div>
                <button onClick={() => setPreviewData(null)} className="w-8 h-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center text-accent-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Summary */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1">Summary</label>
                  <textarea
                    value={previewData.summary}
                    onChange={(e) => setPreviewData({ ...previewData, summary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm h-20 resize-none font-mono"
                  />
                </div>

                {/* Location / Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1"><MapPin size={10} className="inline mr-1" />Location</label>
                    <input type="text" value={previewData.location} onChange={(e) => setPreviewData({ ...previewData, location: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1">Category</label>
                    <select value={previewData.category} onChange={(e) => setPreviewData({ ...previewData, category: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm">
                      {["Water", "Medical", "Food", "Shelter", "Evacuation", "Infrastructure", "Other"].map(c => <option key={c} value={c} className="bg-background">{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Priority / Affected */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1"><AlertTriangle size={10} className="inline mr-1" />Priority</label>
                    <select value={previewData.priority} onChange={(e) => setPreviewData({ ...previewData, priority: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm">
                      {["CRITICAL", "HIGH", "NORMAL"].map(p => <option key={p} value={p} className="bg-background">{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1"><Users size={10} className="inline mr-1" />Affected</label>
                    <input type="text" value={previewData.affected_count} onChange={(e) => setPreviewData({ ...previewData, affected_count: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm" />
                  </div>
                </div>

                {/* Action / Volunteers */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1">Recommended Action</label>
                  <textarea value={previewData.recommended_action} onChange={(e) => setPreviewData({ ...previewData, recommended_action: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm h-16 resize-none font-mono" />
                </div>
                <div className="mt-3">
                  <label className="block text-[10px] text-accent-dim font-bold uppercase mb-1">Volunteers Needed</label>
                  <input type="number" value={previewData.volunteers_needed} onChange={(e) => setPreviewData({ ...previewData, volunteers_needed: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-sm" />
                </div>

                {submitError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded flex items-center gap-1"><XCircle size={14}/>{submitError}</div>}
              </div>

              <div className="sticky bottom-0 flex gap-3 p-5 border-t border-foreground/[0.08] bg-background/95 backdrop-blur-xl">
                <button onClick={() => setPreviewData(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-sm font-medium hover:bg-foreground/5">Cancel</button>
                <button onClick={handleConfirmPost} disabled={isConfirming} className="flex-[2] h-11 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 flex justify-center items-center gap-2">
                  {isConfirming ? "Submitting..." : <><Send size={14}/> Submit Report</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
