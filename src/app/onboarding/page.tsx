"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, HandHeart, ArrowRight, Loader2, MapPin, BadgeCheck, Stethoscope, Clock, ShieldAlert, FileText, BriefcaseMedical, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";

type Role = 'ngo' | 'volunteer' | null;

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'role_selection' | 'ngo_details' | 'volunteer_details'>('role_selection');
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    // Volunteer fields
    location: "",
    skills: "",
    availability: "Weekends",
    // NGO fields
    orgName: "",
    regNumber: "",
    baseLocation: "",
    focusArea: "Medical"
  });

  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (role) {
      router.push(role === 'ngo' ? '/ngo-dashboard' : '/volunteer-dashboard');
    } else {
      setLoading(false);
    }
  }, [router, user, role, authLoading]);

  const handleRoleSelection = (role: 'ngo' | 'volunteer') => {
    setSelectedRole(role);
    setStep(role === 'ngo' ? 'ngo_details' : 'volunteer_details');
  };

  const handleComplete = async () => {
    if (!user || !selectedRole) return;
    setSaving(true);
    
    const metadata = selectedRole === 'ngo' 
      ? { orgName: formData.orgName, regNumber: formData.regNumber, baseLocation: formData.baseLocation, focusArea: formData.focusArea }
      : { location: formData.location, skills: formData.skills, availability: formData.availability };

    try {
      // Update profile in Firestore
      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(profileRef, { 
        id: user.uid,
        name: user.displayName || user.email || "Anonymous",
        avatar_url: user.photoURL || "",
        role: selectedRole,
        metadata: metadata,
        created_at: new Date().toISOString()
      }, { merge: true });
      
      router.push(selectedRole === 'ngo' ? '/ngo-dashboard' : '/volunteer-dashboard');
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden font-helvetica">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-foreground/[0.015] rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-foreground/[0.01] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl mx-4">
        <AnimatePresence mode="wait">
          {step === 'role_selection' && (
            <motion.div
              key="role_selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full"
            >
              <div className="text-center mb-10">
                <div className="w-12 h-12 rounded-xl bg-foreground mx-auto flex items-center justify-center mb-6">
                  <div className="w-4 h-4 bg-background rounded-sm" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Impact Hub</h1>
                <p className="text-accent-muted">Choose your account type to get started</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleRoleSelection('ngo')}
                  className="group relative p-6 rounded-2xl border border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-foreground/[0.15] transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] border border-foreground/[0.08] flex items-center justify-center mb-4 group-hover:bg-foreground/[0.1] transition-all">
                    <Building2 size={22} className="text-foreground/70" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Organization</h3>
                  <p className="text-xs text-accent-dim leading-relaxed">Report incidents, request volunteers, and manage relief efforts.</p>
                  <ArrowRight size={16} className="absolute top-6 right-6 text-accent-dim group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => handleRoleSelection('volunteer')}
                  className="group relative p-6 rounded-2xl border border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-foreground/[0.15] transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] border border-foreground/[0.08] flex items-center justify-center mb-4 group-hover:bg-foreground/[0.1] transition-all">
                    <HandHeart size={22} className="text-foreground/70" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Volunteer</h3>
                  <p className="text-xs text-accent-dim leading-relaxed">Accept missions, deploy to hotspots, and track your impact.</p>
                  <ArrowRight size={16} className="absolute top-6 right-6 text-accent-dim group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'volunteer_details' && (
            <motion.div
              key="volunteer_details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-foreground/[0.08] rounded-2xl p-8 shadow-2xl"
            >
              <button onClick={() => setStep('role_selection')} className="text-xs text-accent-dim hover:text-foreground mb-6 flex items-center gap-1 transition-colors">
                &larr; Back
              </button>
              <h2 className="text-2xl font-bold mb-2">Volunteer Profile</h2>
              <p className="text-accent-muted text-sm mb-8">Help us match you with the right missions.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Your Location / Region</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Downtown Sector 4"
                      className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground placeholder:text-accent-dim"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Primary Skills</label>
                  <div className="relative">
                    <ShieldAlert size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={e => setFormData({...formData, skills: e.target.value})}
                      placeholder="e.g. Medical, Logistics, Driving"
                      className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground placeholder:text-accent-dim"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Availability</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                    <select
                      value={formData.availability}
                      onChange={e => setFormData({...formData, availability: e.target.value})}
                      className="w-full bg-background border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground appearance-none"
                    >
                      <option>Weekends</option>
                      <option>Weekdays</option>
                      <option>Emergency 24/7</option>
                      <option>Evenings</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={saving || !formData.location || !formData.skills}
                  className="w-full mt-6 bg-foreground text-background font-semibold py-3 rounded-lg hover:bg-foreground/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Complete Setup</>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'ngo_details' && (
            <motion.div
              key="ngo_details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-foreground/[0.08] rounded-2xl p-8 shadow-2xl"
            >
              <button onClick={() => setStep('role_selection')} className="text-xs text-accent-dim hover:text-foreground mb-6 flex items-center gap-1 transition-colors">
                &larr; Back
              </button>
              <h2 className="text-2xl font-bold mb-2">NGO Verification</h2>
              <p className="text-accent-muted text-sm mb-8">Register your organization on the network.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Organization Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                    <input
                      type="text"
                      value={formData.orgName}
                      onChange={e => setFormData({...formData, orgName: e.target.value})}
                      placeholder="Official Name"
                      className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground placeholder:text-accent-dim"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Reg Number</label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                      <input
                        type="text"
                        value={formData.regNumber}
                        onChange={e => setFormData({...formData, regNumber: e.target.value})}
                        placeholder="Tax / ID"
                        className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground placeholder:text-accent-dim"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Base Location</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                      <input
                        type="text"
                        value={formData.baseLocation}
                        onChange={e => setFormData({...formData, baseLocation: e.target.value})}
                        placeholder="City / HQ"
                        className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground placeholder:text-accent-dim"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-accent-muted mb-1.5 uppercase tracking-wider">Primary Focus Area</label>
                  <div className="relative">
                    <BriefcaseMedical size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
                    <select
                      value={formData.focusArea}
                      onChange={e => setFormData({...formData, focusArea: e.target.value})}
                      className="w-full bg-background border border-foreground/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all text-foreground appearance-none"
                    >
                      <option>Medical & Health</option>
                      <option>Food & Logistics</option>
                      <option>Search & Rescue</option>
                      <option>Shelter & Housing</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={saving || !formData.orgName || !formData.regNumber}
                  className="w-full mt-6 bg-foreground text-background font-semibold py-3 rounded-lg hover:bg-foreground/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><BadgeCheck size={18} /> Complete Verification</>}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
