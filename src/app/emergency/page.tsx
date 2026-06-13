"use client";

import { auth, db } from "@/lib/firebase/client";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  Clock3,
  FileText,
  MapPin,
  Mic,
  MicOff,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

type ReportMode = "text" | "voice" | "image";

type IncidentSummary = {
  id: string;
  location: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
};

type VerificationResult = {
  ai_verified: boolean;
  confidence_score: number;
  verification_status: "auto_verified" | "pending_review";
} | null;

const modeConfig: Record<ReportMode, { label: string; icon: any; hint: string }> = {
  text: { label: "Text", icon: FileText, hint: "Type incident details" },
  voice: { label: "Voice", icon: Mic, hint: "Dictate the problem" },
  image: { label: "Image", icon: Camera, hint: "Upload an image" },
};

const priorityStyles: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-300 border-red-500/20",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  NORMAL: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
};

const statusStyles: Record<string, string> = {
  "Active": "text-emerald-400",
  "Pending Review": "text-amber-400",
  "Processing": "text-blue-400",
  "In Transit": "text-purple-400",
  "Resolved": "text-slate-500",
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
};

export default function EmergencyPage() {

  const [mode, setMode] = useState<ReportMode>("text");
  const [location, setLocation] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterMobile, setReporterMobile] = useState("");
  const [reportText, setReportText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recentIncidents, setRecentIncidents] = useState<IncidentSummary[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      orderBy("created_at", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as IncidentSummary))
        .filter(inc => inc.status !== "Resolved")
        .slice(0, 6);
      
      setRecentIncidents(data);
      setLoadingRecent(false);
    }, (error) => {
      console.error("Error loading incidents:", error);
      setLoadingRecent(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const nextPreview = URL.createObjectURL(imageFile);
    setImagePreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [imageFile]);

  const combinedText = useMemo(() => reportText.trim(), [reportText]);

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Voice capture is not supported in this browser. Use text entry instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");

      setReportText(transcript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setErrorMessage("Voice capture stopped unexpectedly. Please try again.");
    };

    recognitionRef.current = recognition;
    setErrorMessage("");
    setIsListening(true);
    recognition.start();
  };

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!reporterName.trim()) {
      setErrorMessage("Please add the user's name before sending the emergency.");
      return;
    }

    if (!reporterMobile.trim()) {
      setErrorMessage("Please add the user's phone number so responders can follow up.");
      return;
    }

    // Phone number validation — must be at least 10 digits
    const digitsOnly = reporterMobile.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      setErrorMessage("Phone number must be at least 10 digits. Please enter a valid, reachable number.");
      return;
    }

    if (!location.trim()) {
      setErrorMessage("Location is required so responders can act quickly.");
      return;
    }

    const hasText = combinedText.length > 0;
    if (mode !== "image" && !hasText) {
      setErrorMessage("Add a short description before sending the emergency report.");
      return;
    }

    if (mode === "image" && !imageFile && !hasText) {
      setErrorMessage("Upload an image or add a description for the emergency report.");
      return;
    }

    setIsSubmitting(true);

    try {
      const incidentText = `${location.trim()}. ${combinedText || "Emergency report submitted with image evidence."}`.trim();
      const submittedAt = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      let response: Response;

      if (mode === "image" && imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("description", incidentText);
        formData.append("location", location.trim());
        formData.append("reporter_name", reporterName.trim());
        formData.append("reporter_mobile", reporterMobile.trim());

        response = await fetch("/api/ai/vision", {
          method: "POST",
          headers,
          body: formData,
        });
      } else {
        response = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: incidentText,
            reporter_name: reporterName.trim(),
            reporter_mobile: reporterMobile.trim(),
          }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "Emergency dispatch failed.");
      }

      setLocation("");
      setReportText("");
      setImageFile(null);
      setImagePreview(null);
      setMode("text");
      setLastSubmittedAt(submittedAt);

      // Store AI verification result
      if (result?.data) {
        setVerificationResult({
          ai_verified: result.data.ai_verified ?? true,
          confidence_score: result.data.confidence_score ?? 0,
          verification_status: result.data.verification_status ?? "auto_verified",
        });
      }

      if (result?.data?.summary) {
        setReportText(result.data.summary);
      }

      if (result?.data?.ai_verified) {
        setSuccessMessage(`✅ Emergency auto-verified (AI confidence: ${result.data.confidence_score}%) and dispatched for ${reporterName.trim()} at ${submittedAt}.`);
      } else {
        setSuccessMessage(`⚠️ Emergency submitted for ${reporterName.trim()} at ${submittedAt}. AI confidence: ${result?.data?.confidence_score ?? 0}% — forwarded to NGO/Admin review team for verification before dispatch.`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Emergency report failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),_rgba(2,6,23,1)_58%)] text-slate-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] h-[28rem] w-[28rem] rounded-full bg-slate-400/10 blur-3xl" />
        <div className="absolute top-[18%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_15%,#000_30%,transparent_85%)] opacity-40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-100"
          >
            <ShieldAlert size={13} /> Emergency mode
          </motion.div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Back to home
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-[2rem] border border-slate-700/70 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-2xl sm:p-8"
          >
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
                Report an Emergency
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-400">
                Send a live incident report immediately. No sign-in required.
              </p>
            </div>

            {/* Main reporting form follows */}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Location</span>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Sector 7, Ahmedabad"
                      className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
                    />
                  </div>
                </label>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Report mode</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(modeConfig) as ReportMode[]).map((item) => {
                      const config = modeConfig[item];
                      const active = mode === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setMode(item)}
                          className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-semibold uppercase tracking-[0.16em] transition ${active ? "border-slate-200 bg-slate-100 text-slate-950" : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-50"}`}
                        >
                          <config.icon size={14} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">User name</span>
                  <input
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Enter the reporter's name"
                    className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Phone no</span>
                  <input
                    value={reporterMobile}
                    onChange={(e) => setReporterMobile(e.target.value)}
                    type="tel"
                    inputMode="tel"
                    placeholder="Enter a reachable phone number"
                    className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <label className="flex flex-col h-full space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Emergency details</span>
                    <span className="text-[10px] text-slate-500">{modeConfig[mode].hint}</span>
                  </div>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Describe what happened, who is affected, and what is needed right now."
                    className="min-h-[180px] w-full resize-none rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
                  />
                </label>

                <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Sparkles size={16} className="text-slate-300" />
                    Voice and image support
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={isListening ? stopVoiceCapture : startVoiceCapture}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${isListening ? "border-red-400/30 bg-red-500/15 text-red-100" : "border-slate-200 bg-slate-100 text-slate-950 hover:bg-white"}`}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                      {isListening ? "Stop recording" : "Start voice input"}
                    </button>
                  </div>

                  <label className="mt-5 block space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Image evidence</span>
                    <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/50 p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-950 file:font-semibold"
                      />
                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <Upload size={12} /> Attach a photo
                      </p>
                    </div>
                  </label>

                  {imagePreview && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/80">
                      <img src={imagePreview} alt="Emergency preview" className="h-40 w-full object-cover" />
                      <div className="bg-gradient-to-t from-black/75 to-transparent p-3 text-xs text-white/85">
                        Image ready for emergency dispatch.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={`rounded-2xl border p-4 text-sm ${
                      verificationResult?.ai_verified
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    <div>{successMessage}</div>
                    {verificationResult && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                          verificationResult.ai_verified
                            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                            : "border-amber-400/30 bg-amber-500/15 text-amber-200"
                        }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            verificationResult.ai_verified ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                          }`} />
                          {verificationResult.ai_verified ? "Auto-verified" : "Pending review"}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Confidence: {verificationResult.confidence_score}%
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="h-4 w-4 rounded-full border-2 border-slate-950/20 border-t-slate-950" />
                    Broadcasting emergency...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send emergency report
                  </>
                )}
              </button>
            </form>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {/* AI Confidence Score Card */}
            <div className="rounded-[2rem] border border-slate-700/70 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                  verificationResult
                    ? verificationResult.ai_verified
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                      : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                    : "border-red-400/20 bg-red-500/10 text-red-100"
                }`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">AI verification</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                    {verificationResult ? (verificationResult.ai_verified ? "Auto-verified" : "Pending review") : "Awaiting report"}
                  </h2>
                </div>
              </div>

              {verificationResult ? (
                <div className="space-y-4">
                  {/* Confidence Gauge */}
                  <div className="flex items-center justify-center py-3">
                    <div className="relative h-32 w-32">
                      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
                        <motion.circle
                          cx="64" cy="64" r="56"
                          fill="none"
                          strokeWidth="8"
                          strokeLinecap="round"
                          className={verificationResult.confidence_score > 85 ? "text-emerald-400" : verificationResult.confidence_score > 50 ? "text-amber-400" : "text-red-400"}
                          stroke="currentColor"
                          strokeDasharray={`${(verificationResult.confidence_score / 100) * 351.86} 351.86`}
                          initial={{ strokeDasharray: "0 351.86" }}
                          animate={{ strokeDasharray: `${(verificationResult.confidence_score / 100) * 351.86} 351.86` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          className={`text-3xl font-bold ${
                            verificationResult.confidence_score > 85 ? "text-emerald-300" : verificationResult.confidence_score > 50 ? "text-amber-300" : "text-red-300"
                          }`}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        >
                          {verificationResult.confidence_score}%
                        </motion.span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">Confidence</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`rounded-xl border p-3 text-center ${
                    verificationResult.ai_verified
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : "border-amber-500/20 bg-amber-500/10"
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full animate-pulse ${
                        verificationResult.ai_verified ? "bg-emerald-400" : "bg-amber-400"
                      }`} />
                      <span className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        verificationResult.ai_verified ? "text-emerald-200" : "text-amber-200"
                      }`}>
                        {verificationResult.ai_verified ? "Direct dispatch — report is live" : "Forwarded to NGO & Admin review team"}
                      </span>
                    </div>
                  </div>

                  {/* Threshold Explanation */}
                  <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
                      <span className="text-slate-500">Threshold</span>
                      <span className="text-slate-400 font-semibold">&gt;85% = Auto-dispatch</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="relative h-full">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 w-full rounded-full" />
                        <div className="absolute top-[-2px] bottom-[-2px]" style={{ left: '85%' }}>
                          <div className="h-full w-px bg-slate-100" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-600">
                      <span>0%</span>
                      <span>Review</span>
                      <span>85%</span>
                      <span>Auto</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  <p>AI instantly analyzes reports for auto-dispatch (&gt;85% confidence).</p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-700/70 bg-slate-950/70 p-6 backdrop-blur-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight text-slate-50">Live emergency feed</h3>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent</span>
              </div>

              <div className="space-y-3">
                {loadingRecent ? (
                  <div className="py-12 text-center text-sm text-slate-400">Loading active emergencies...</div>
                ) : recentIncidents.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">No active emergencies right now.</div>
                ) : (
                  recentIncidents.map((incident) => (
                    <div key={incident.id} className={`rounded-2xl border p-4 ${
                      incident.status === "Pending Review"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-slate-700/70 bg-slate-900/70"
                    }`}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-50">{incident.location}</p>
                          <p className="text-xs text-slate-400">{incident.type || "Emergency"}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${priorityStyles[incident.priority] || "border-slate-600 bg-slate-800 text-slate-200"}`}>
                          {incident.priority || "HIGH"}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-400">{incident.description || "Emergency report in progress."}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        <span className={`flex items-center gap-1.5 ${statusStyles[incident.status] || "text-slate-500"}`}>
                          {incident.status === "Pending Review" && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          )}
                          {incident.status === "Active" && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                          {incident.status}
                        </span>
                        {/* Extract & display AI confidence from description */}
                        {(() => {
                          const match = incident.description?.match(/AI Confidence:\s*(\d+)%/);
                          if (match) {
                            const conf = parseInt(match[1]);
                            return (
                              <span className={`flex items-center gap-1 font-semibold ${
                                conf > 85 ? "text-emerald-400" : conf > 50 ? "text-amber-400" : "text-red-400"
                              }`}>
                                <Sparkles size={9} />
                                AI: {conf}%
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <span>Posted: {new Date(incident.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {lastSubmittedAt && (
              <div className={`rounded-[2rem] border p-6 text-sm backdrop-blur-2xl ${
                verificationResult?.ai_verified
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-100"
              }`}>
                <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  verificationResult?.ai_verified ? "text-emerald-200" : "text-amber-200"
                }`}>Latest submission</div>
                <div className={`mt-2 text-base font-semibold ${
                  verificationResult?.ai_verified ? "text-emerald-50" : "text-amber-50"
                }`}>{reporterName || "Reporter"}</div>
                <div className="mt-1 opacity-90">Posted at {lastSubmittedAt}</div>
                <div className="mt-1 opacity-90">Contact: {reporterMobile || "Not provided"}</div>
                {verificationResult && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      verificationResult.ai_verified
                        ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                        : "border-amber-400/30 bg-amber-500/20 text-amber-200"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        verificationResult.ai_verified ? "bg-emerald-400" : "bg-amber-400"
                      }`} />
                      {verificationResult.confidence_score}% confidence
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </main>
  );
}