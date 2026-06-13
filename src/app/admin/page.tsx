"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Users, Building2, ShieldAlert, CheckSquare, Square, X, Edit3, Save, Search, MapPin, BriefcaseMedical, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"emergencies" | "ngos" | "volunteers">("emergencies");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Deep Management State - NGO
  const [expandedNgo, setExpandedNgo] = useState<any>(null);
  const [ngoMembers, setNgoMembers] = useState<any[]>([]);
  const [ngoIncidents, setNgoIncidents] = useState<any[]>([]);
  const [editingNgo, setEditingNgo] = useState(false);
  const [ngoForm, setNgoForm] = useState({ orgName: "", baseLocation: "", focusArea: "" });

  // Deep Management State - Volunteer
  const [expandedVol, setExpandedVol] = useState<any>(null);
  const [volMissions, setVolMissions] = useState<any[]>([]);
  const [editingVol, setEditingVol] = useState(false);
  const [volForm, setVolForm] = useState({ location: "", skills: "", availability: "" });
  
  const { user, role, metadata, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/dashboard");
        return;
      }
      if (user.email !== "dy3239073@gmail.com" && metadata?.is_admin !== true) {
        router.push("/dashboard");
        return;
      }
      setIsAdmin(true);
      fetchData();
    }
  }, [user, metadata, authLoading, router]);

  // Clear selections when switching tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Incidents
      const incsSnap = await getDocs(collection(db, "incidents"));
      const incs = incsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      incs.sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      setIncidents(incs);

      // 2. Profiles
      const profilesSnap = await getDocs(collection(db, "profiles"));
      const profiles = profilesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      
      setNgos(profiles.filter(p => p.role === "ngo"));
      setVolunteers(profiles.filter(p => p.role === "volunteer"));
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = (items: any[]) => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to completely delete ${selectedIds.length} items?`)) return;
    
    try {
      if (activeTab === "emergencies") {
        setIncidents(incs => incs.filter(i => !selectedIds.includes(i.id)));
        const batch = writeBatch(db);
        
        // Find and delete associated missions
        const missionsSnap = await getDocs(collection(db, "missions"));
        missionsSnap.docs.forEach(docSnap => {
          const m = docSnap.data();
          if (selectedIds.includes(m.incident_id)) {
            batch.delete(docSnap.ref);
          }
        });
        
        selectedIds.forEach(id => {
          batch.delete(doc(db, "incidents", id));
        });
        await batch.commit();
      } else if (activeTab === "ngos" || activeTab === "volunteers") {
        if (activeTab === "ngos") {
          setNgos(n => n.filter(i => !selectedIds.includes(i.id)));
        } else {
          setVolunteers(v => v.filter(i => !selectedIds.includes(i.id)));
        }
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, "profiles", id));
        });
        await batch.commit();
      }
      setSelectedIds([]);
    } catch (err) {
      console.error("Error bulk deleting items:", err);
    }
  };

  const handleBulkResolve = async () => {
    if (activeTab !== "emergencies") return;
    setIncidents(incs => incs.map(i => selectedIds.includes(i.id) ? { ...i, status: "Resolved" } : i));
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, "incidents", id), { status: "Resolved" });
      });
      await batch.commit();
      setSelectedIds([]);
    } catch (err) {
      console.error("Error bulk resolving incidents:", err);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this incident?")) return;
    try {
      const batch = writeBatch(db);
      const missionsSnap = await getDocs(collection(db, "missions"));
      missionsSnap.docs.forEach(docSnap => {
        const m = docSnap.data();
        if (m.incident_id === id) {
          batch.delete(docSnap.ref);
        }
      });
      batch.delete(doc(db, "incidents", id));
      await batch.commit();
      fetchData();
    } catch (err) {
      console.error("Error deleting incident:", err);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Are you sure you want to remove this profile?")) return;
    try {
      await deleteDoc(doc(db, "profiles", id));
      fetchData();
    } catch (err) {
      console.error("Error deleting profile:", err);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    let nextStatus = "Processing";
    if (currentStatus === "Active") nextStatus = "Processing";
    else if (currentStatus === "Processing") nextStatus = "In Transit";
    else if (currentStatus === "In Transit") nextStatus = "Resolved";
    else return;
    setIncidents(incs => incs.map(i => i.id === id ? { ...i, status: nextStatus } : i));
    try {
      await updateDoc(doc(db, "incidents", id), { status: nextStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Verify & Dispatch: Approve a pending review incident and broadcast to all responders
  const handleVerifyIncident = async (id: string) => {
    setIncidents(incs => incs.map(i => i.id === id ? { ...i, status: "Active" } : i));
    try {
      await updateDoc(doc(db, "incidents", id), { status: "Active" });

      // Broadcast to all volunteers and NGOs now that it's verified
      const incident = incidents.find(i => i.id === id);
      if (incident) {
        const profilesSnap = await getDocs(collection(db, "profiles"));
        const responderProfiles = profilesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(p => p.role === 'volunteer' || p.role === 'ngo');

        const batch = writeBatch(db);
        responderProfiles.forEach((profile: any) => {
          const notifRef = doc(collection(db, "notifications"));
          batch.set(notifRef, {
            id: notifRef.id,
            user_id: profile.id,
            type: "alert",
            title: `✅ VERIFIED: ${incident.type || "Emergency"} in ${incident.location}`,
            body: `Admin verified and dispatched this emergency. ${incident.description || "Immediate response required."}`,
            read: false,
            created_at: new Date().toISOString()
          });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Verify broadcast failed:", err);
    }
  };

  const handlePurgeResolved = async () => {
    const resolvedIds = incidents.filter(i => i.status === "Resolved").map(i => i.id);
    if (resolvedIds.length === 0) return alert("No resolved incidents to purge.");
    if (!confirm(`Are you sure you want to permanently delete ${resolvedIds.length} resolved incidents?`)) return;
    setIncidents(incs => incs.filter(i => i.status !== "Resolved"));
    try {
      const batch = writeBatch(db);
      const missionsSnap = await getDocs(collection(db, "missions"));
      missionsSnap.docs.forEach(docSnap => {
        const m = docSnap.data();
        if (resolvedIds.includes(m.incident_id)) {
          batch.delete(docSnap.ref);
        }
      });
      resolvedIds.forEach(id => {
        batch.delete(doc(db, "incidents", id));
      });
      await batch.commit();
    } catch (err) {
      console.error("Error purging resolved incidents:", err);
    }
  };

  // Deep NGO Management Actions
  const handleExpandNgo = async (ngo: any) => {
    setExpandedNgo(ngo);
    setEditingNgo(false);
    setNgoForm({
      orgName: ngo.metadata?.orgName || ngo.name || "",
      baseLocation: ngo.metadata?.baseLocation || "",
      focusArea: ngo.metadata?.focusArea || ""
    });

    try {
      const incsSnap = await getDocs(query(collection(db, "incidents"), where("created_by", "==", ngo.id)));
      setNgoIncidents(incsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));

      const membersSnap = await getDocs(query(collection(db, "ngo_members"), where("ngo_user_id", "==", ngo.id)));
      const membersData = membersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      
      const resolvedMembers = await Promise.all(membersData.map(async (nm: any) => {
        if (!nm.member_user_id) return { ...nm, member: null };
        const mSnap = await getDoc(doc(db, "profiles", nm.member_user_id));
        return {
          ...nm,
          member: mSnap.exists() ? { id: mSnap.id, ...mSnap.data() } : null
        };
      }));
      setNgoMembers(resolvedMembers);
    } catch (err) {
      console.error("Error expanding NGO info:", err);
    }
  };

  const handleSaveNgo = async () => {
    const newMetadata = { ...expandedNgo.metadata, ...ngoForm };
    const updatedNgo = { ...expandedNgo, metadata: newMetadata, name: ngoForm.orgName };
    setExpandedNgo(updatedNgo);
    setNgos(n => n.map(x => x.id === updatedNgo.id ? updatedNgo : x));
    setEditingNgo(false);
    try {
      await updateDoc(doc(db, "profiles", updatedNgo.id), { metadata: newMetadata, name: ngoForm.orgName });
    } catch (err) {
      console.error("Error saving NGO profile:", err);
    }
  };

  const handleToggleAdminNgo = async () => {
    const currentIsAdmin = expandedNgo.metadata?.is_admin === true;
    const newMetadata = { ...expandedNgo.metadata, is_admin: !currentIsAdmin };
    const updatedNgo = { ...expandedNgo, metadata: newMetadata };
    setExpandedNgo(updatedNgo);
    setNgos(n => n.map(x => x.id === updatedNgo.id ? updatedNgo : x));
    try {
      await updateDoc(doc(db, "profiles", updatedNgo.id), { metadata: newMetadata });
    } catch (err) {
      console.error("Error toggling NGO admin:", err);
    }
  };

  const handleExpandVol = async (vol: any) => {
    setExpandedVol(vol);
    setEditingVol(false);
    
    let skillsString = "";
    if (Array.isArray(vol.metadata?.skills)) skillsString = vol.metadata.skills.join(", ");
    else if (typeof vol.metadata?.skills === 'string') skillsString = vol.metadata.skills;

    setVolForm({
      location: vol.metadata?.location || "",
      skills: skillsString,
      availability: vol.metadata?.availability || ""
    });

    try {
      const missionsSnap = await getDocs(query(collection(db, "missions"), where("volunteer_id", "==", vol.id)));
      const missionsData = missionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      
      const resolvedMissions = await Promise.all(missionsData.map(async (m: any) => {
        if (!m.incident_id) return { ...m, incident: null };
        const incSnap = await getDoc(doc(db, "incidents", m.incident_id));
        return {
          ...m,
          incident: incSnap.exists() ? { id: incSnap.id, ...incSnap.data() } : null
        };
      }));
      setVolMissions(resolvedMissions);
    } catch (err) {
      console.error("Error expanding volunteer info:", err);
    }
  };

  const handleSaveVol = async () => {
    const skillsArray = volForm.skills.split(',').map(s => s.trim()).filter(Boolean);
    const newMetadata = { ...expandedVol.metadata, location: volForm.location, skills: skillsArray, availability: volForm.availability };
    const updatedVol = { ...expandedVol, metadata: newMetadata };
    setExpandedVol(updatedVol);
    setVolunteers(v => v.map(x => x.id === updatedVol.id ? updatedVol : x));
    setEditingVol(false);
    try {
      await updateDoc(doc(db, "profiles", updatedVol.id), { metadata: newMetadata });
    } catch (err) {
      console.error("Error saving volunteer profile:", err);
    }
  };

  const handleToggleAdminVol = async () => {
    const currentIsAdmin = expandedVol.metadata?.is_admin === true;
    const newMetadata = { ...expandedVol.metadata, is_admin: !currentIsAdmin };
    const updatedVol = { ...expandedVol, metadata: newMetadata };
    setExpandedVol(updatedVol);
    setVolunteers(v => v.map(x => x.id === updatedVol.id ? updatedVol : x));
    try {
      await updateDoc(doc(db, "profiles", updatedVol.id), { metadata: newMetadata });
    } catch (err) {
      console.error("Error toggling volunteer admin:", err);
    }
  };

  // Filtering Logic
  const filteredIncidents = incidents.filter(i => 
    (i.location || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (i.type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.status || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredNgos = ngos.filter(n => 
    (n.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.metadata?.orgName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.metadata?.focusArea || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredVols = volunteers.filter(v => {
    const name = v.full_name || v.metadata?.full_name || v.name || v.email || "";
    let skills = "";
    if (Array.isArray(v.metadata?.skills)) skills = v.metadata.skills.join(" ");
    else if (typeof v.metadata?.skills === 'string') skills = v.metadata.skills;
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || skills.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isAdmin) return null;

  return (
    <DashboardLayout role="admin">
      <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Super Admin Dashboard
                {/* <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest animate-pulse">
                  God Mode Active
                </span> */}
              </h1>
              <p className="text-sm text-accent-dim mt-1">Full control access granted for dy3239073@gmail.com</p>
            </div>
          </div>
          
          {/* Universal Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-foreground placeholder:text-accent-dim"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-foreground/[0.06] pb-4 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: "emergencies", label: "Live Emergencies", icon: AlertTriangle, count: incidents.length },
            { id: "ngos", label: "Registered NGOs", icon: Building2, count: ngos.length },
            { id: "volunteers", label: "Volunteers", icon: Users, count: volunteers.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-foreground text-background shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "bg-foreground/[0.03] text-accent-dim hover:text-foreground hover:bg-foreground/[0.06]"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                activeTab === tab.id ? "bg-background/20" : "bg-foreground/[0.06]"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              
              {/* Emergencies Tab */}
              {activeTab === "emergencies" && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => toggleAll(filteredIncidents)}
                      className="text-xs text-accent-dim hover:text-foreground flex items-center gap-1.5"
                    >
                      {selectedIds.length === filteredIncidents.length && filteredIncidents.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                      Select All {searchQuery && "Matching"}
                    </button>
                    <button 
                      onClick={handlePurgeResolved}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      PURGE ALL RESOLVED
                    </button>
                  </div>
                  <div className="bg-background/50 backdrop-blur-xl border border-foreground/[0.06] rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase tracking-widest text-accent-dim bg-foreground/[0.02] border-b border-foreground/[0.06]">
                        <tr>
                          <th className="px-4 py-3 w-10"></th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Type & Status</th>
                          <th className="px-4 py-3 font-medium">Priority</th>
                          <th className="px-4 py-3 font-medium text-right">Admin Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/[0.04]">
                        {filteredIncidents.map((inc) => (
                          <tr key={inc.id} className={`hover:bg-foreground/[0.02] transition-colors ${selectedIds.includes(inc.id) ? 'bg-indigo-500/5' : ''}`}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleSelection(inc.id)} className="text-accent-dim hover:text-foreground">
                                {selectedIds.includes(inc.id) ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-medium">{inc.location}</td>
                            <td className="px-4 py-3">
                              <div className="text-foreground">{inc.type}</div>
                              <div className={`text-[10px] mt-0.5 flex items-center gap-1.5 ${
                                inc.status === "Pending Review" ? "text-amber-400 font-semibold" : "text-accent-dim"
                              }`}>
                                {inc.status === "Pending Review" && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                                {inc.status}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                inc.priority === "CRITICAL" ? "bg-red-500/10 text-red-500" :
                                inc.priority === "HIGH" ? "bg-amber-500/10 text-amber-500" :
                                "bg-green-500/10 text-green-500"
                              }`}>
                                {inc.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {inc.status === "Pending Review" && (
                                  <button 
                                    onClick={() => handleVerifyIncident(inc.id)}
                                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                                  >
                                    <CheckSquare size={12} />
                                    VERIFY & DISPATCH
                                  </button>
                                )}
                                {inc.status !== "Resolved" && inc.status !== "Pending Review" && (
                                  <button 
                                    onClick={() => handleUpdateStatus(inc.id, inc.status)}
                                    className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold transition-all"
                                  >
                                    {inc.status === "Active" ? "PROCESS" : inc.status === "Processing" ? "DISPATCH" : "RESOLVE"}
                                  </button>
                                )}
                                <button onClick={() => handleDeleteIncident(inc.id)} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded transition-colors" title="Force Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredIncidents.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-accent-dim">No matching emergencies.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* NGOs Tab */}
              {activeTab === "ngos" && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => toggleAll(filteredNgos)}
                      className="text-xs text-accent-dim hover:text-foreground flex items-center gap-1.5"
                    >
                      {selectedIds.length === filteredNgos.length && filteredNgos.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                      Select All {searchQuery && "Matching"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNgos.map((ngo) => (
                      <div 
                        key={ngo.id} 
                        className={`bg-background/50 backdrop-blur-xl border ${selectedIds.includes(ngo.id) ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-foreground/[0.06]'} rounded-xl p-5 hover:border-foreground/20 transition-all cursor-pointer relative group`}
                        onClick={(e) => {
                          if ((e.target as any).closest('.ngo-checkbox') || (e.target as any).closest('.ngo-delete')) return;
                          handleExpandNgo(ngo);
                        }}
                      >
                        <div className="absolute top-4 left-4 ngo-checkbox">
                          <button onClick={() => toggleSelection(ngo.id)} className="text-accent-dim hover:text-foreground">
                            {selectedIds.includes(ngo.id) ? <CheckSquare size={18} className="text-indigo-400" /> : <Square size={18} />}
                          </button>
                        </div>
                        <div className="flex flex-col items-center text-center mt-2">
                          <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl border border-indigo-500/30 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            {ngo.metadata?.orgName ? ngo.metadata.orgName.charAt(0).toUpperCase() : 'N'}
                          </div>
                          <h3 className="font-bold text-lg leading-tight">{ngo.metadata?.orgName || ngo.name || "Unnamed NGO"}</h3>
                          <p className="text-xs text-accent-dim mt-1">{ngo.metadata?.focusArea || "No focus specified"}</p>
                          <div className="mt-4 px-3 py-1 bg-foreground/[0.04] rounded-full text-[10px] text-accent-dim font-mono">
                            ID: {ngo.id.substring(0,8)}...
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteProfile(ngo.id)}
                          className="absolute top-4 right-4 text-red-400/50 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors ngo-delete opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {filteredNgos.length === 0 && <div className="col-span-full p-8 text-center text-accent-dim border border-dashed border-foreground/[0.1] rounded-xl">No matching NGOs.</div>}
                  </div>
                </>
              )}

              {/* Volunteers Tab */}
              {activeTab === "volunteers" && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => toggleAll(filteredVols)}
                      className="text-xs text-accent-dim hover:text-foreground flex items-center gap-1.5"
                    >
                      {selectedIds.length === filteredVols.length && filteredVols.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                      Select All {searchQuery && "Matching"}
                    </button>
                  </div>
                  <div className="bg-background/50 backdrop-blur-xl border border-foreground/[0.06] rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase tracking-widest text-accent-dim bg-foreground/[0.02] border-b border-foreground/[0.06]">
                        <tr>
                          <th className="px-4 py-3 w-10"></th>
                          <th className="px-4 py-3 font-medium">Volunteer Name</th>
                          <th className="px-4 py-3 font-medium">Skills</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/[0.04]">
                        {filteredVols.map((vol) => {
                          const volName = vol.full_name || vol.metadata?.full_name || vol.name || vol.email || "Anonymous Volunteer";
                          return (
                            <tr 
                              key={vol.id} 
                              className={`hover:bg-foreground/[0.02] transition-colors cursor-pointer group ${selectedIds.includes(vol.id) ? 'bg-indigo-500/5' : ''}`}
                              onClick={(e) => {
                                if ((e.target as any).closest('.vol-checkbox') || (e.target as any).closest('.vol-delete')) return;
                                handleExpandVol(vol);
                              }}
                            >
                              <td className="px-4 py-3 vol-checkbox">
                                <button onClick={() => toggleSelection(vol.id)} className="text-accent-dim hover:text-foreground">
                                  {selectedIds.includes(vol.id) ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {vol.avatar_url ? (
                                    <img src={vol.avatar_url} className="w-8 h-8 rounded-full border border-foreground/10" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                                      {volName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold">{volName}</div>
                                    <div className="text-[10px] text-accent-dim font-mono">{vol.id.substring(0,8)}...</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const skillsRaw = vol.metadata?.skills;
                                    const skillsList = Array.isArray(skillsRaw) ? skillsRaw : (typeof skillsRaw === 'string' ? skillsRaw.split(',').map(s => s.trim()) : []);
                                    return skillsList.length > 0 ? (
                                      <>
                                        {skillsList.slice(0, 3).map((skill: string) => (
                                          <span key={skill} className="px-1.5 py-0.5 rounded bg-foreground/[0.04] text-[9px] text-accent-dim border border-foreground/[0.06]">
                                            {skill}
                                          </span>
                                        ))}
                                        {skillsList.length > 3 && <span className="text-[9px] text-accent-dim">+{skillsList.length - 3}</span>}
                                      </>
                                    ) : <span className="text-xs text-accent-muted">None specified</span>;
                                  })()}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleDeleteProfile(vol.id)}
                                  className="text-red-400/50 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors vol-delete opacity-0 group-hover:opacity-100"
                                  title="Delete Volunteer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {filteredVols.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-accent-dim">No matching volunteers.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-3 px-6 flex items-center gap-6 pointer-events-auto"
          >
            <div className="text-sm font-bold flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </div>
              Selected
            </div>
            <div className="w-px h-6 bg-foreground/10" />
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <Trash2 size={14} />
                Bulk Delete
              </button>
              {activeTab === "emergencies" && (
                <button 
                  onClick={handleBulkResolve}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                >
                  <CheckSquare size={14} />
                  Bulk Resolve
                </button>
              )}
            </div>
            <button onClick={() => setSelectedIds([])} className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deep NGO Management Drawer Overlay */}
      <AnimatePresence>
        {expandedNgo && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setExpandedNgo(null)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-background border-l border-foreground/[0.06] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-foreground/[0.06] bg-foreground/[0.02] flex items-start justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-500/30">
                    {expandedNgo.metadata?.orgName ? expandedNgo.metadata.orgName.charAt(0).toUpperCase() : 'N'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {expandedNgo.metadata?.orgName || expandedNgo.name || "Unnamed NGO"}
                      {expandedNgo.metadata?.is_admin && <ShieldAlert size={14} className="text-red-500" />}
                    </h2>
                    <p className="text-[10px] text-accent-dim font-mono mt-0.5">ID: {expandedNgo.id}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedNgo(null)} className="p-2 text-accent-dim hover:text-foreground bg-foreground/[0.04] rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* Admin Powers */}
                <section className="p-4 bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <ShieldAlert size={16} className={expandedNgo.metadata?.is_admin ? "text-red-500" : "text-accent-dim"} /> 
                      God Mode Privileges
                    </h3>
                    <p className="text-xs text-accent-dim mt-1">Grant or revoke full dashboard access.</p>
                  </div>
                  <button 
                    onClick={handleToggleAdminNgo}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                      expandedNgo.metadata?.is_admin 
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                        : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    }`}
                  >
                    {expandedNgo.metadata?.is_admin ? "Revoke Admin" : "Grant Admin"}
                  </button>
                </section>
                
                {/* Details Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-accent-dim">Organization Details</h3>
                    <button onClick={() => setEditingNgo(!editingNgo)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Edit3 size={12} /> {editingNgo ? "Cancel" : "Edit"}
                    </button>
                  </div>
                  
                  {editingNgo ? (
                    <div className="space-y-3 bg-foreground/[0.02] p-4 rounded-xl border border-foreground/[0.06]">
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Name</label>
                        <input type="text" value={ngoForm.orgName} onChange={e => setNgoForm({...ngoForm, orgName: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Location</label>
                        <input type="text" value={ngoForm.baseLocation} onChange={e => setNgoForm({...ngoForm, baseLocation: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Focus Area</label>
                        <input type="text" value={ngoForm.focusArea} onChange={e => setNgoForm({...ngoForm, focusArea: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <button onClick={handleSaveNgo} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-bold mt-2 flex justify-center items-center gap-2">
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-foreground/[0.04] pb-2">
                        <span className="text-accent-dim">Location:</span>
                        <span className="font-medium text-right">{expandedNgo.metadata?.baseLocation || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between border-b border-foreground/[0.04] pb-2">
                        <span className="text-accent-dim">Focus Area:</span>
                        <span className="font-medium text-right">{expandedNgo.metadata?.focusArea || "None"}</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-accent-dim">Reg Number:</span>
                        <span className="font-medium font-mono text-right">{expandedNgo.metadata?.regNumber || "N/A"}</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* Team Roster */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-accent-dim mb-4 flex justify-between">
                    Team Members
                    <span className="bg-foreground/[0.06] px-2 py-0.5 rounded text-[10px]">{ngoMembers.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {ngoMembers.map(nm => {
                      const m = nm.member;
                      if (!m) return null;
                      const mName = m.full_name || m.metadata?.full_name || m.name || m.email || "Anonymous Member";
                      return (
                        <div key={nm.id} className="flex items-center justify-between p-3 bg-foreground/[0.02] border border-foreground/[0.04] rounded-lg group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center font-bold text-xs">
                              {mName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium leading-tight">{mName}</div>
                              <div className="text-[10px] text-accent-dim capitalize">{nm.role || "Member"}</div>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!confirm("Kick this member from the NGO?")) return;
                              setNgoMembers(prev => prev.filter(x => x.id !== nm.id));
                              try {
                                await deleteDoc(doc(db, "ngo_members", nm.id));
                              } catch (err) {
                                console.error("Error kicking member:", err);
                              }
                            }}
                            className="text-red-400/50 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Kick Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })}
                    {ngoMembers.length === 0 && <p className="text-xs text-accent-dim">No members have joined this NGO.</p>}
                  </div>
                </section>

                {/* Incidents Created */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-accent-dim mb-4 flex justify-between">
                    Incidents Reported
                    <span className="bg-foreground/[0.06] px-2 py-0.5 rounded text-[10px]">{ngoIncidents.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {ngoIncidents.map(inc => (
                      <div key={inc.id} className="p-3 bg-foreground/[0.02] border border-foreground/[0.04] rounded-lg flex items-start justify-between group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-medium text-foreground">{inc.type}</div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              inc.status === 'Resolved' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {inc.status}
                            </span>
                          </div>
                          <div className="text-xs text-accent-dim">{inc.location}</div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!confirm("Delete this incident?")) return;
                            setNgoIncidents(prev => prev.filter(x => x.id !== inc.id));
                            setIncidents(prev => prev.filter(x => x.id !== inc.id));
                            try {
                              const batch = writeBatch(db);
                              const missionsSnap = await getDocs(collection(db, "missions"));
                              missionsSnap.docs.forEach(docSnap => {
                                if (docSnap.data().incident_id === inc.id) {
                                  batch.delete(docSnap.ref);
                                }
                              });
                              batch.delete(doc(db, "incidents", inc.id));
                              await batch.commit();
                            } catch (err) {
                              console.error("Error deleting incident:", err);
                            }
                          }}
                          className="text-red-400/50 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Incident"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {ngoIncidents.length === 0 && <p className="text-xs text-accent-dim">This NGO has not reported any incidents.</p>}
                  </div>
                </section>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deep Volunteer Management Drawer Overlay */}
      <AnimatePresence>
        {expandedVol && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setExpandedVol(null)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-background border-l border-foreground/[0.06] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-foreground/[0.06] bg-foreground/[0.02] flex items-start justify-between shrink-0">
                <div className="flex items-center gap-4">
                  {expandedVol.avatar_url ? (
                    <img src={expandedVol.avatar_url} className="w-12 h-12 rounded-xl border border-foreground/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xl border border-emerald-500/30">
                      {(expandedVol.full_name || expandedVol.metadata?.full_name || expandedVol.name || expandedVol.email || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {expandedVol.full_name || expandedVol.metadata?.full_name || expandedVol.name || expandedVol.email || "Anonymous Volunteer"}
                      {expandedVol.metadata?.is_admin && <ShieldAlert size={14} className="text-red-500" />}
                    </h2>
                    <p className="text-[10px] text-accent-dim font-mono mt-0.5">ID: {expandedVol.id}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedVol(null)} className="p-2 text-accent-dim hover:text-foreground bg-foreground/[0.04] rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* Admin Powers */}
                <section className="p-4 bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <ShieldAlert size={16} className={expandedVol.metadata?.is_admin ? "text-red-500" : "text-accent-dim"} /> 
                      God Mode Privileges
                    </h3>
                    <p className="text-xs text-accent-dim mt-1">Grant or revoke full dashboard access.</p>
                  </div>
                  <button 
                    onClick={handleToggleAdminVol}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                      expandedVol.metadata?.is_admin 
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                        : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    }`}
                  >
                    {expandedVol.metadata?.is_admin ? "Revoke Admin" : "Grant Admin"}
                  </button>
                </section>
                
                {/* Details Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-accent-dim">Volunteer Profile</h3>
                    <button onClick={() => setEditingVol(!editingVol)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Edit3 size={12} /> {editingVol ? "Cancel" : "Edit"}
                    </button>
                  </div>
                  
                  {editingVol ? (
                    <div className="space-y-3 bg-foreground/[0.02] p-4 rounded-xl border border-foreground/[0.06]">
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Location</label>
                        <input type="text" value={volForm.location} onChange={e => setVolForm({...volForm, location: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Skills (comma separated)</label>
                        <input type="text" value={volForm.skills} onChange={e => setVolForm({...volForm, skills: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-accent-dim">Availability</label>
                        <input type="text" value={volForm.availability} onChange={e => setVolForm({...volForm, availability: e.target.value})} className="w-full bg-background border border-foreground/[0.08] rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <button onClick={handleSaveVol} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-bold mt-2 flex justify-center items-center gap-2">
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 border-b border-foreground/[0.04] pb-3">
                        <MapPin size={16} className="text-accent-dim" />
                        <span className="font-medium">{expandedVol.metadata?.location || "Location not specified"}</span>
                      </div>
                      <div className="flex items-center gap-3 border-b border-foreground/[0.04] pb-3">
                        <BriefcaseMedical size={16} className="text-accent-dim shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {volForm.skills ? volForm.skills.split(',').map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-foreground/[0.04] text-[9px] text-accent-dim border border-foreground/[0.06]">
                              {s.trim()}
                            </span>
                          )) : <span className="text-xs text-accent-muted">No skills listed</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pb-2">
                        <Clock size={16} className="text-accent-dim" />
                        <span className="font-medium">{expandedVol.metadata?.availability || "Availability not specified"}</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* Mission History */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-accent-dim mb-4 flex justify-between">
                    Mission History
                    <span className="bg-foreground/[0.06] px-2 py-0.5 rounded text-[10px]">{volMissions.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {volMissions.map(m => (
                      <div key={m.id} className="p-3 bg-foreground/[0.02] border border-foreground/[0.04] rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-sm font-medium text-foreground">{m.incident?.type || "Unknown Incident"}</div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            m.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <div className="text-xs text-accent-dim">{m.incident?.location || "Unknown Location"}</div>
                        <div className="text-[10px] text-accent-muted mt-2 pt-2 border-t border-foreground/[0.04] font-mono">
                          Mission ID: {m.id.substring(0,8)}
                        </div>
                      </div>
                    ))}
                    {volMissions.length === 0 && <p className="text-xs text-accent-dim">This volunteer has not been assigned to any missions yet.</p>}
                  </div>
                </section>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
