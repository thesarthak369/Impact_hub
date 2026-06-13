"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Palette, Database, Key, Save, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, role, metadata } = useAuth();
  
  const [profile, setProfile] = useState({ name: "", email: "", role: "", org: "" });
  const [notifSettings, setNotifSettings] = useState({ criticalAlerts: true, aiUpdates: true, volunteerStatus: true, weeklyReports: true, emailDigest: false, smsAlerts: false });
  const [aiSettings, setAiSettings] = useState({ autoProcess: true, autoDispatch: false, confidenceThreshold: 75, model: "gemini-2.5-flash" });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.displayName || metadata?.orgName || "",
        email: user.email || "",
        role: role || "",
        org: metadata?.orgName || metadata?.location || ""
      });
      setLoading(false);
    }
  }, [user, role, metadata]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      let newMetadata = metadata || {};
      
      if (profile.role === 'ngo') {
        newMetadata.orgName = profile.org || profile.name;
      } else if (profile.role === 'volunteer') {
        newMetadata.location = profile.org;
      }

      await setDoc(doc(db, "profiles", user.uid), {
        name: profile.name,
        metadata: newMetadata
      }, { merge: true });

      setSaved(true); 
      setTimeout(() => setSaved(false), 2000); 
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-10 h-5 rounded-full transition-all relative ${checked ? "bg-foreground" : "bg-foreground/[0.1]"}`}>
      <div className={`w-4 h-4 rounded-full transition-all absolute top-0.5 ${checked ? "left-5.5 bg-background" : "left-0.5 bg-accent-muted"}`} />
    </button>
  );

  return (
    <DashboardLayout role={profile.role as "ngo" | "volunteer" | "admin" || "admin"}>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-accent-dim mt-0.5">Manage your account, notifications, and AI preferences.</p>
          </div>
          <button onClick={handleSave} disabled={saving || loading}
            className="px-5 py-2 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center gap-2 hover:bg-foreground/80 active:scale-[0.98] transition-all disabled:opacity-50">
            {saving ? "Saving..." : saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <div className="space-y-6">

          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm"><User size={15} className="text-accent-muted" />Profile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: "Full Name", key: "name" as const, type: "text" },
                { label: "Email", key: "email" as const, type: "email" },
                { label: "Role", key: "role" as const, type: "text" },
                { label: profile.role === 'volunteer' ? "Location" : "Organization", key: "org" as const, type: "text" },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-1.5 font-medium">{field.label}</label>
                  <input type={field.type} value={profile[field.key as keyof typeof profile]} onChange={e => setProfile({ ...profile, [field.key]: e.target.value })} disabled={field.key === 'email' || field.key === 'role'}
                    className="w-full px-4 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground focus:outline-none focus:border-foreground/15 transition-all disabled:opacity-50" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Notification Preferences */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm"><Bell size={15} className="text-accent-muted" />Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { key: "criticalAlerts" as const, label: "Critical Alerts", desc: "Instant notifications for CRITICAL priority incidents" },
                { key: "aiUpdates" as const, label: "AI Processing Updates", desc: "When NLP/Vision analysis completes on new reports" },
                { key: "volunteerStatus" as const, label: "Volunteer Status Changes", desc: "Dispatch confirmations, mission completions" },
                { key: "weeklyReports" as const, label: "Weekly Impact Reports", desc: "Summary of incidents, resolutions, and metrics" },
                { key: "emailDigest" as const, label: "Email Digest", desc: "Daily summary email of all activity" },
                { key: "smsAlerts" as const, label: "SMS Alerts", desc: "Text messages for critical incidents only" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-foreground/[0.03] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="text-[11px] text-accent-dim">{item.desc}</div>
                  </div>
                  <Toggle checked={notifSettings[item.key]} onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key] })} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Engine Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm"><SettingsIcon size={15} className="text-accent-muted" />AI Engine Configuration</h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-Process Reports</div>
                  <div className="text-[11px] text-accent-dim">Automatically run NLP on incoming field reports</div>
                </div>
                <Toggle checked={aiSettings.autoProcess} onChange={() => setAiSettings({ ...aiSettings, autoProcess: !aiSettings.autoProcess })} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-Dispatch Volunteers</div>
                  <div className="text-[11px] text-accent-dim">Automatically dispatch matched volunteers for CRITICAL incidents</div>
                </div>
                <Toggle checked={aiSettings.autoDispatch} onChange={() => setAiSettings({ ...aiSettings, autoDispatch: !aiSettings.autoDispatch })} />
              </div>

              <div>
                <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-2 font-medium">Confidence Threshold: {aiSettings.confidenceThreshold}%</label>
                <input type="range" min={50} max={100} value={aiSettings.confidenceThreshold}
                  onChange={e => setAiSettings({ ...aiSettings, confidenceThreshold: Number(e.target.value) })}
                  className="w-full h-1.5 bg-foreground/[0.06] rounded-full appearance-none cursor-pointer accent-white" />
                <div className="flex justify-between text-[10px] text-accent-dim mt-1"><span>50% (Aggressive)</span><span>100% (Conservative)</span></div>
              </div>

              <div>
                <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-1.5 font-medium">AI Model</label>
                <select value={aiSettings.model} onChange={e => setAiSettings({ ...aiSettings, model: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground/70 focus:outline-none focus:border-foreground/15 transition-all appearance-none">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                  <option value="gemini-2.0-pro">Gemini 2.0 Pro (Accurate)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Security */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm"><Shield size={15} className="text-accent-muted" />Security</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-1.5 font-medium">API Key Status</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                  <Key size={14} className="text-accent-dim" />
                  <span className="text-sm text-accent-muted font-mono">AIza•••••••N_w</span>
                  <CheckCircle2 size={14} className="text-foreground ml-auto" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-1.5 font-medium">Session</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                  <Globe size={14} className="text-accent-dim" />
                  <span className="text-sm text-accent-muted">Active — expires in 24h</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse ml-auto" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-5 flex items-center gap-2 text-sm"><Database size={15} className="text-accent-muted" />Data & Storage</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "Reports Processed", value: "309" },
                { label: "Images Analyzed", value: "47" },
                { label: "API Calls Today", value: "1,248" },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] text-center">
                  <div className="text-xl font-bold font-mono">{s.value}</div>
                  <div className="text-[10px] text-accent-dim">{s.label}</div>
                </div>
              ))}
            </div>
            <button className="w-full h-10 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-xs text-accent-muted hover:text-foreground transition-colors">
              Export All Data (JSON)
            </button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
