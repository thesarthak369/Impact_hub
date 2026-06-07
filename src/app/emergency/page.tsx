"use client";

import { createClient } from "@/lib/supabase/client";
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
import { useEffect, useMemo, useRef, useState } from "react";

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

const modeConfig: Record<ReportMode, { label: string; icon: any; hint: string }> = {
  text: { label: "Text", icon: FileText, hint: "Type a quick field note or full incident summary." },
  voice: { label: "Voice", icon: Mic, hint: "Dictate the problem and let the browser transcribe it." },
  image: { label: "Image", icon: Camera, hint: "Upload a photo so AI can assess the situation visually." },
};

const priorityStyles: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-300 border-red-500/20",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  NORMAL: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
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
  const supabase = createClient();
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
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    async function loadIncidents() {
      const { data } = await supabase
        .from("incidents")
        .select("id, location, type, priority, status, description, created_at")
        .neq("status", "Resolved")
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setRecentIncidents(data as IncidentSummary[]);
      }

      setLoadingRecent(false);
    }

    loadIncidents();

    const channel = supabase
      .channel("public:emergency_incidents")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        loadIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
          body: formData,
        });
      } else {
        response = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

      const { data } = await supabase
        .from("incidents")
        .select("id, location, type, priority, status, description, created_at")
        .neq("status", "Resolved")
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setRecentIncidents(data as IncidentSummary[]);
      }

      if (result?.data?.summary) {
        setReportText(result.data.summary);
      }
      setSuccessMessage(`Emergency report sent for ${reporterName.trim()} at ${submittedAt}.`);
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
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
                Report an emergency without sign-in.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                Use text, voice, or an image to send a live incident immediately. This view stays focused on reporting and response, with no shared navigation or login gate in the way.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Broadcast", value: "Volunteers + NGOs", icon: Users },
                { label: "Mode", value: "Text / Voice / Image", icon: Radio },
                { label: "Speed", value: "Live incident feed", icon: Clock3 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <span>{item.label}</span>
                    <item.icon size={14} />
                  </div>
                  <div className="text-sm font-medium text-slate-100">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-slate-700/70 bg-slate-900/40 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Details highlighted</p>
                <p className="mt-1 text-sm font-medium text-slate-100">Location, description, and evidence appear in the live feed.</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Reporter info</p>
                <p className="mt-1 text-sm font-medium text-slate-100">Name and phone are saved with the emergency submission.</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Posting time</p>
                <p className="mt-1 text-sm font-medium text-slate-100">Timestamp is captured when the report is sent.</p>
              </div>
            </div>

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
                <label className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Emergency details</span>
                    <span className="text-[10px] text-slate-500">{modeConfig[mode].hint}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3 text-xs text-slate-300">
                    Highlight the incident clearly. Mention who needs help, the exact location, and any immediate danger.
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
                    <p className="text-xs leading-relaxed text-slate-400">
                      Speech stays in the browser and becomes text for dispatch.
                    </p>
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
                        <Upload size={12} /> Attach a photo for visual AI analysis and incident logging.
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
                    className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100"
                  >
                    {successMessage}
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

              <p className="text-xs leading-relaxed text-slate-400">
                No sign-in is required here. Reports are sent directly into the live incident feed for responders and stamped with the posting time.
              </p>
            </form>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="rounded-[2rem] border border-slate-700/70 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Emergency routing</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-50">Always visible to response teams</h2>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-slate-300">
                <p>Reports are analyzed instantly, converted into incidents, and pushed to volunteer and NGO notification feeds.</p>
                <p>Use image uploads when you have visual evidence, voice when you need speed, and text when you want precision.</p>
                <p>The reporter name and phone number are preserved with the submission, so response teams can contact the right person quickly.</p>
              </div>
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
                    <div key={incident.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
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
                        <span>Status: {incident.status}</span>
                        <span>Posted: {new Date(incident.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {lastSubmittedAt && (
              <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-6 text-sm text-emerald-100 backdrop-blur-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Latest submission</div>
                <div className="mt-2 text-base font-semibold text-emerald-50">{reporterName || "Reporter"}</div>
                <div className="mt-1 text-emerald-100/90">Posted at {lastSubmittedAt}</div>
                <div className="mt-1 text-emerald-100/90">Contact: {reporterMobile || "Not provided"}</div>
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </main>
  );
}