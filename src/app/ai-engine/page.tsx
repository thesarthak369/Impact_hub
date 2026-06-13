"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Image as ImageIcon, HeartHandshake, Workflow, ArrowRight, CheckCircle2, AlertTriangle, Cpu, Zap, Upload, X, Sparkles, MapPin, XCircle, Database } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

interface NlpResult { location: string; resource_needed: string; priority: string; affected_count: string; category: string; summary: string; recommended_action: string; confidence_score: number; volunteers_needed?: string | number; _source?: string; [key: string]: string | number | undefined; }
interface VisionResult { severity: string; confidence: number; damage_type: string; description: string; hazards_identified: string[]; immediate_actions: string[]; estimated_affected_area: string; infrastructure_status: string; volunteers_needed?: string | number; location?: string; _source?: string; }
interface MatchVolunteer { name: string; match_score: number; reasoning: string; estimated_arrival: string; assigned_role: string; }
interface MatchResult { recommended_volunteers: MatchVolunteer[]; team_composition_notes: string; coverage_gaps: string[]; dispatch_priority_order: string[]; _source?: string; }

export default function AIEnginePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (role === 'volunteer') {
        router.replace('/ai-briefing');
        return;
      }
      setRoleChecked(true);
    }
  }, [role, loading, router]);

  const [nlpInput, setNlpInput] = useState("");
  const [nlpProcessing, setNlpProcessing] = useState(false);
  const [nlpResult, setNlpResult] = useState<NlpResult | null>(null);
  const [nlpError, setNlpError] = useState("");

  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionPreview, setVisionPreview] = useState<string | null>(null);
  const [visionLocation, setVisionLocation] = useState("");
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);
  const [visionError, setVisionError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [matchProcessing, setMatchProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState("");

  const [pipelineStep, setPipelineStep] = useState(0);
  useEffect(() => { const i = setInterval(() => setPipelineStep(p => (p + 1) % 5), 1500); return () => clearInterval(i); }, []);

  const steps = [
    { label: "Data Ingestion", icon: Database },
    { label: "NLP Extraction", icon: BrainCircuit },
    { label: "Priority Scoring", icon: AlertTriangle },
    { label: "Geo Mapping", icon: MapPin },
    { label: "Volunteer Match", icon: HeartHandshake },
  ];

  const handleNlp = async () => {
    if (!nlpInput.trim()) return;
    setNlpProcessing(true); setNlpResult(null); setNlpError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/ai/analyze", { method: "POST", headers, body: JSON.stringify({ text: nlpInput }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details || "Request failed");
      setNlpResult(json.data);
    } catch (e: unknown) { setNlpError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setNlpProcessing(false); }
  };

  const handleVisionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setVisionFile(file); setVisionPreview(URL.createObjectURL(file)); setVisionResult(null); setVisionError("");
  };

  const handleVisionAnalyze = async () => {
    if (!visionLocation.trim()) { setVisionError("⚠ Location is required. Please enter the area/city where this image was taken."); return; }
    setVisionAnalyzing(true); setVisionResult(null); setVisionError("");
    try {
      const fd = new FormData();
      if (visionFile) fd.append("image", visionFile);
      fd.append("location", visionLocation.trim());
      
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch("/api/ai/vision", { method: "POST", headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setVisionResult(json.data);
    } catch (e: unknown) { setVisionError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setVisionAnalyzing(false); }
  };

  const handleMatch = async () => {
    setMatchProcessing(true); setMatchResult(null); setMatchError("");
    try {
      const incident = nlpResult
        ? { location: nlpResult.location, type: nlpResult.category, priority: nlpResult.priority, affected: nlpResult.affected_count }
        : { location: "Sector 7 North", type: "Water Crisis", priority: "CRITICAL", affected: "500 people" };
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch("/api/ai/match", { method: "POST", headers, body: JSON.stringify({ incident }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setMatchResult(json.data);
    } catch (e: unknown) { setMatchError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setMatchProcessing(false); }
  };

  if (!roleChecked) {
    return (<DashboardLayout role="ngo"><div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout role="ngo">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">NGO Data Upload Center</h1>
            <span className="px-2 py-0.5 rounded-full bg-foreground/10 border border-foreground/15 text-[10px] font-bold tracking-wider text-foreground">LIVE</span>
          </div>
          <p className="text-sm text-accent-dim">Upload field reports, disaster images, and let AI extract intelligence — data flows directly to heatmaps.</p>
        </div>

        {/* Pipeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <motion.div animate={{ borderColor: pipelineStep === i ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)", backgroundColor: pipelineStep === i ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)" }} className="flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[130px]">
                  <s.icon size={16} className={pipelineStep === i ? "text-foreground" : "text-accent-dim"} />
                  <span className={`text-xs font-medium ${pipelineStep === i ? "text-foreground" : "text-accent-dim"}`}>{s.label}</span>
                  {pipelineStep > i && <CheckCircle2 size={12} className="text-accent-dim ml-auto" />}
                  {pipelineStep === i && <Cpu size={12} className="text-foreground animate-spin ml-auto" />}
                </motion.div>
                {i < steps.length - 1 && <ArrowRight size={14} className="text-accent-dim shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* NLP with location validation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-1 flex items-center gap-2 text-sm">
              <BrainCircuit size={15} className="text-accent-muted" />NLP Data Extraction<Sparkles size={12} className="text-foreground ml-auto" />
            </h2>
            <p className="text-[11px] text-accent-dim mb-4">Paste field data. <span className="text-red-400 font-bold">Location must be mentioned</span> or data will be rejected.</p>

            <textarea value={nlpInput} onChange={e => setNlpInput(e.target.value)}
              placeholder="e.g. '500 people need water in Sector 7, Delhi — infrastructure damaged by flood, urgent medical supplies required'"
              className="w-full h-28 px-4 py-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground placeholder:text-accent-dim focus:outline-none focus:border-foreground/15 resize-none font-mono mb-3 transition-all" />

            <button onClick={handleNlp} disabled={nlpProcessing || !nlpInput.trim()}
              className="w-full h-10 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-2 hover:bg-foreground/80 active:scale-[0.98] disabled:opacity-30 transition-all">
              {nlpProcessing ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-background/20 border-t-black rounded-full" /> Extracting with Gemini...</> : <><BrainCircuit size={14} /> Extract & Upload to Heatmap</>}
            </button>

            {nlpError && <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2"><XCircle size={14} className="shrink-0 mt-0.5" /><div><div className="font-semibold mb-0.5">Rejected</div>{nlpError}</div></div>}

            <AnimatePresence>
              {nlpResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.08] font-mono text-xs space-y-2">
                  <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Uploaded to Heatmap</span>
                    <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold border bg-foreground/10 text-foreground border-foreground/20">⚡ GEMINI</span>
                  </div>
                  {["location", "resource_needed", "priority", "affected_count", "category", "summary", "recommended_action", "volunteers_needed", "confidence_score"].map(key => (
                    nlpResult[key] !== undefined && (
                      <div key={key} className="flex justify-between border-b border-foreground/[0.04] pb-1.5 gap-4">
                        <span className="text-accent-dim capitalize shrink-0">{key.replace(/_/g, " ")}:</span>
                        <span className={`text-right ${key === "priority" ? "font-bold text-foreground" : key === "location" ? "font-bold text-emerald-400" : "text-foreground/70"}`}>{String(nlpResult[key])}</span>
                      </div>
                    )
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Vision with location */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-1 flex items-center gap-2 text-sm">
              <ImageIcon size={15} className="text-accent-muted" />Image Upload & AI Analysis<Sparkles size={12} className="text-foreground ml-auto" />
            </h2>
            <p className="text-[11px] text-accent-dim mb-4">Upload disaster zone photos. AI analyzes damage and adds the location to the heatmap.</p>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleVisionUpload} />

            {!visionPreview ? (
              <button onClick={() => fileRef.current?.click()} className="w-full border border-dashed border-foreground/[0.1] rounded-xl p-8 text-center hover:border-foreground/20 transition-colors cursor-pointer group">
                <Upload size={24} className="mx-auto text-accent-dim mb-3 group-hover:text-accent-muted transition-colors" />
                <p className="text-sm text-accent-muted">Upload disaster area image</p>
                <p className="text-[10px] text-accent-dim mt-1">PNG, JPG, WebP — analyzed by Gemini Vision</p>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-foreground/[0.06]">
                  <img src={visionPreview} alt="Upload" className="w-full h-40 object-cover" />
                  <button onClick={() => { setVisionFile(null); setVisionPreview(null); setVisionResult(null); setVisionLocation(""); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/70 backdrop-blur-sm border border-foreground/10 flex items-center justify-center text-accent-muted hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Location input for image */}
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                  <input type="text" value={visionLocation} onChange={e => setVisionLocation(e.target.value)}
                    placeholder="Enter location (e.g. Sector 7, Delhi)"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground placeholder:text-accent-dim focus:outline-none focus:border-foreground/15 transition-all" />
                </div>

                {!visionResult && (
                  <button onClick={handleVisionAnalyze} disabled={visionAnalyzing}
                    className="w-full h-10 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-2 hover:bg-foreground/80 active:scale-[0.98] disabled:opacity-50 transition-all">
                    {visionAnalyzing ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-background/20 border-t-black rounded-full" /> Analyzing...</> : <><ImageIcon size={14} /> Analyze & Upload</>}
                  </button>
                )}
              </div>
            )}

            {visionError && <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2"><XCircle size={14} className="shrink-0 mt-0.5" />{visionError}</div>}

            <AnimatePresence>
              {visionResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
                  <div className="p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.08]">
                    <div className="text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-400" /><span className="text-emerald-400 font-bold">Analyzed & Mapped</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center mb-3">
                      <div><div className="text-lg font-bold">{visionResult.severity}</div><div className="text-[10px] text-accent-dim">Severity</div></div>
                      <div><div className="text-lg font-bold">{visionResult.confidence}%</div><div className="text-[10px] text-accent-dim">Confidence</div></div>
                      <div><div className="text-xs font-bold mt-1">{visionResult.damage_type}</div><div className="text-[10px] text-accent-dim">Type</div></div>
                      <div><div className="text-lg font-bold">{visionResult.volunteers_needed || "N/A"}</div><div className="text-[10px] text-accent-dim">Volunteers</div></div>
                    </div>
                    {visionLocation && <div className="text-xs text-emerald-400 flex items-center gap-1 mb-2"><MapPin size={11} /> {visionLocation} — added to heatmap</div>}
                    <p className="text-xs text-accent-muted leading-relaxed border-t border-foreground/[0.04] pt-3">{visionResult.description}</p>
                  </div>
                  <button onClick={() => { setVisionFile(null); setVisionPreview(null); setVisionResult(null); setVisionLocation(""); }}
                    className="w-full h-9 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-xs text-accent-muted hover:text-foreground transition-colors">Upload Another Image</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Smart Matching */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="md:col-span-2 p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold flex items-center gap-2 text-sm"><HeartHandshake size={15} className="text-accent-muted" />Smart Volunteer Matching<Sparkles size={12} className="text-foreground" /></h2>
              <button onClick={handleMatch} disabled={matchProcessing}
                className="px-5 py-2 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center gap-2 hover:bg-foreground/80 active:scale-[0.98] disabled:opacity-50 transition-all">
                {matchProcessing ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-background/20 border-t-black rounded-full" /> Matching...</> : <><Zap size={13} /> Run AI Matching</>}
              </button>
            </div>

            {matchError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{matchError}</div>}

            {!matchResult ? (
              <div className="text-center py-12 text-accent-dim">
                <HeartHandshake size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Click &quot;Run AI Matching&quot; to dispatch volunteers using Gemini AI.</p>
                <p className="text-[11px] text-accent-dim mt-1">{nlpResult ? "Using your NLP extraction as incident data." : "Using default incident data."}</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {matchResult.recommended_volunteers?.map((v, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] hover:border-foreground/[0.1] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 border border-foreground/10 flex items-center justify-center text-[10px] font-bold">{v.name?.charAt(0)}</div>
                          <div><div className="text-sm font-medium">{v.name}</div><div className="text-[10px] text-accent-dim">{v.assigned_role}</div></div>
                        </div>
                        <div className="text-lg font-bold font-mono">{v.match_score}</div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden mb-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${v.match_score}%` }} transition={{ duration: 1, delay: i * 0.2 }} className="h-full rounded-full bg-gradient-to-r from-gray-500 to-white" />
                      </div>
                      <p className="text-[10px] text-accent-dim leading-relaxed">{v.reasoning}</p>
                      <div className="text-[10px] text-accent-dim mt-1.5">ETA: {v.estimated_arrival}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
