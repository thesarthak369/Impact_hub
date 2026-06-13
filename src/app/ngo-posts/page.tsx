"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, AlertTriangle, CheckCircle2, X, Users,
  Filter, Search, Activity, Cpu, Trash2, Edit3, Check, RefreshCw, Sparkles, Plus, Eye
} from "lucide-react";
import { useState, useEffect, useMemo, Suspense } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/components/providers/AuthProvider";

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
  volunteers_needed: number;
  missions?: any[];
}

function NGOPostsInner() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Edit State
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editForm, setEditForm] = useState({
    location: "",
    type: "",
    priority: "",
    affected: "",
    description: "",
    volunteers_needed: 0
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Set document title
  useEffect(() => {
    document.title = "My Posts | Impact Hub";
  }, []);

  // Subscribe to incidents posted by current NGO
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "incidents"),
      where("created_by", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      
      // Sort docs by created_at descending in JS to avoid index requirement
      docs.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      // Join missions in memory to calculate deployed volunteers
      try {
        const missionsSnap = await getDocs(collection(db, "missions"));
        const missionsList = missionsSnap.docs.map(d => d.data());
        
        const mapped = docs.map(inc => {
          const incMissions = missionsList.filter((m: any) => m.incident_id === inc.id);
          return { ...inc, missions: incMissions };
        });
        
        setIncidents(mapped);
      } catch (err) {
        console.error("Error fetching missions for incident mapping:", err);
        setIncidents(docs);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("NGO Incidents subscription error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Quick stats calculations
  const stats = useMemo(() => {
    return {
      total: incidents.length,
      active: incidents.filter(i => i.status !== "Resolved").length,
      resolved: incidents.filter(i => i.status === "Resolved").length,
    };
  }, [incidents]);

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    const now = new Date();
    const m = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const matchesFilter = filter === "all" || i.priority === filter || i.status === filter;
      const matchesSearch = !search ||
        i.location.toLowerCase().includes(search.toLowerCase()) ||
        i.type?.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [incidents, filter, search]);

  // Delete Action
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post? This will also delete any related volunteer missions. This action cannot be undone.")) return;

    try {
      // 1. Delete associated missions
      const missionsQuery = query(collection(db, "missions"), where("incident_id", "==", id));
      const mSnap = await getDocs(missionsQuery);
      for (const mDoc of mSnap.docs) {
        await deleteDoc(mDoc.ref);
      }
      
      // 2. Delete incident
      await deleteDoc(doc(db, "incidents", id));
      
      if (selectedIncident?.id === id) {
        setSelectedIncident(null);
      }
    } catch (error) {
      console.error("Error deleting incident post:", error);
      alert("Failed to delete the post. Please check console for errors.");
    }
  };

  // Toggle Status (Resolve / Re-activate)
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Resolved" ? "Active" : "Resolved";
      await updateDoc(doc(db, "incidents", id), {
        status: newStatus
      });
      
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  // Edit Modal Opening
  const handleOpenEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setEditForm({
      location: incident.location,
      type: incident.type || "Other",
      priority: incident.priority || "NORMAL",
      affected: incident.affected || "Unknown",
      description: incident.description || "",
      volunteers_needed: incident.volunteers_needed || 0
    });
    setEditError("");
  };

  // Save Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;

    if (!editForm.location.trim()) {
      setEditError("Location name is required.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");

    try {
      await updateDoc(doc(db, "incidents", editingIncident.id), {
        location: editForm.location,
        type: editForm.type,
        priority: editForm.priority,
        affected: editForm.affected,
        description: editForm.description,
        volunteers_needed: Number(editForm.volunteers_needed) || 0
      });
      
      setEditingIncident(null);
    } catch (error) {
      console.error("Error updating incident post:", error);
      setEditError("Failed to update post. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const priorityStyle = (p: string) => {
    if (p === "CRITICAL") return "bg-red-500/15 text-red-400 border-red-500/25";
    if (p === "HIGH") return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  };

  return (
    <DashboardLayout role="ngo">
      <div className="p-6 md:p-8 max-w-7xl mx-auto font-helvetica space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-1">
              My Posted Incidents
            </h1>
            <p className="text-sm text-accent-dim">Manage the emergencies, requests, and updates your NGO has posted.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] text-xs text-foreground font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Syncing
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Posts", value: stats.total, color: "text-foreground" },
            { label: "Active Posts", value: stats.active, color: "text-amber-400" },
            { label: "Resolved Posts", value: stats.resolved, color: "text-emerald-400" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] text-center glass-panel">
              <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-accent-dim uppercase tracking-wider mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-dim" />
            <input
              type="text"
              placeholder="Search my posts by location, type, or description..."
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

        {/* Incident List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-accent-dim text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <span>Fetching your records...</span>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-accent-dim text-sm glass-panel border border-foreground/[0.06] rounded-2xl">
            <AlertTriangle size={32} className="opacity-20 mb-3" />
            <span>No posts match your search or filter requirements.</span>
            <span className="text-[11px] text-accent-muted mt-1">Submit new reports via the NGO Dashboard.</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredIncidents.map((inc, i) => {
              const activeMissionsCount = inc.missions?.filter((m: any) => m.status !== 'Completed').length || 0;
              return (
                <motion.div
                  key={inc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-foreground/[0.04] to-foreground/[0.01] border border-foreground/[0.06] hover:border-foreground/[0.12] transition-all hover:shadow-lg overflow-hidden glass-panel"
                >
                  {/* Priority indicator stripe */}
                  <div className={`absolute top-0 left-0 w-full h-[2.5px] ${
                    inc.priority === "CRITICAL" ? "bg-red-500/60" :
                    inc.priority === "HIGH" ? "bg-amber-500/60" : "bg-emerald-500/60"
                  }`} />

                  <div>
                    {/* Top Row: Location, Priority & Date */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div>
                        <div className="font-bold text-foreground text-lg tracking-tight group-hover:text-white transition-colors flex items-center gap-1.5">
                          <MapPin size={14} className="text-accent-dim shrink-0" />
                          {inc.location}
                        </div>
                        <div className="text-[11px] text-accent-dim mt-0.5 font-medium flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-foreground/[0.05] text-accent-muted text-[10px]">{inc.type || "General"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {getTimeAgo(inc.created_at)}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border shrink-0 ${priorityStyle(inc.priority)}`}>
                        {inc.priority}
                      </span>
                    </div>

                    {/* Middle: Description */}
                    {inc.description && (
                      <p className="text-xs text-accent-muted leading-relaxed mb-4 line-clamp-3">
                        {inc.description}
                      </p>
                    )}
                  </div>

                  {/* Volunteer Deployed & Status Metadata */}
                  <div className="space-y-3 pt-3 border-t border-foreground/[0.04]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-accent-dim flex items-center gap-1.5">
                        <Users size={12} /> {inc.affected || "Unknown"} affected
                      </span>
                      {inc.volunteers_needed > 0 && (
                        <span className={`px-2 py-0.5 rounded font-mono border ${
                          activeMissionsCount >= inc.volunteers_needed 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                        }`}>
                          {activeMissionsCount} / {inc.volunteers_needed} volunteers assigned
                        </span>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/[0.03]">
                      
                      {/* Left: Status Toggle */}
                      <button
                        onClick={() => handleToggleStatus(inc.id, inc.status)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          inc.status === "Resolved"
                            ? "bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/25"
                            : "bg-foreground/[0.03] text-accent-dim border-foreground/[0.08] hover:text-foreground hover:bg-foreground/[0.06]"
                        }`}
                      >
                        {inc.status === "Resolved" ? (
                          <><CheckCircle2 size={13} className="text-green-400 animate-pulse" /> Resolved</>
                        ) : (
                          <><Activity size={13} className="text-accent-muted" /> Mark Resolved</>
                        )}
                      </button>

                      {/* Right: Edit & Delete buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(inc)}
                          className="flex items-center justify-center p-1.5 rounded-lg text-accent-dim hover:text-foreground hover:bg-foreground/[0.05] border border-transparent hover:border-foreground/10 transition-all"
                          title="Edit Incident"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(inc.id)}
                          className="flex items-center justify-center p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                          title="Delete Incident"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="flex items-center justify-center p-1.5 rounded-lg text-accent-dim hover:text-foreground hover:bg-foreground/[0.05] border border-transparent hover:border-foreground/10 transition-all"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* === DETAILS PREVIEW MODAL === */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-[999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedIncident(null)}
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
                  className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-[#141417] border border-foreground/10 rounded-2xl shadow-2xl my-8 overflow-hidden"
                >
                  <div className={`h-1.5 w-full shrink-0 ${
                    selectedIncident.priority === "CRITICAL" ? "bg-red-500/60" :
                    selectedIncident.priority === "HIGH" ? "bg-amber-500/60" : "bg-emerald-500/60"
                  }`} />

                  <div className="p-6 overflow-y-auto space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
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

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/[0.05] text-center">
                        <div className={`text-sm font-bold ${selectedIncident.priority === "CRITICAL" ? "text-red-400" : selectedIncident.priority === "HIGH" ? "text-amber-400" : "text-emerald-400"}`}>{selectedIncident.priority}</div>
                        <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Priority</div>
                      </div>
                      <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/[0.05] text-center">
                        <div className="text-sm font-bold">{selectedIncident.affected || "Unknown"}</div>
                        <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Affected</div>
                      </div>
                      <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/[0.05] text-center">
                        <div className={`text-sm font-bold ${selectedIncident.status === "Resolved" ? "text-emerald-400" : "text-amber-400"}`}>{selectedIncident.status}</div>
                        <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Status</div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedIncident.description && (
                      <div className="p-4 rounded-xl bg-foreground/[0.01] border border-foreground/[0.04] space-y-2">
                        <div className="text-[10px] text-accent-dim uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={10} className="text-accent-dim" /> Description & Summary
                        </div>
                        <p className="text-sm text-accent-muted leading-relaxed whitespace-pre-wrap">{selectedIncident.description}</p>
                      </div>
                    )}

                    {/* Metadata details */}
                    <div className="p-4 rounded-xl bg-foreground/[0.01] border border-foreground/[0.04] space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-accent-dim">Category</span>
                        <span className="text-foreground font-medium">{selectedIncident.type || "General"}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                        <span className="text-accent-dim">Volunteers Required</span>
                        <span className="text-foreground font-medium font-mono">{selectedIncident.volunteers_needed}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                        <span className="text-accent-dim">Deployed Missions</span>
                        <span className="text-indigo-400 font-medium font-mono">
                          {selectedIncident.missions?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                        <span className="text-accent-dim">Posted At</span>
                        <span className="text-foreground font-medium">
                          {selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString() : "Unknown"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="w-full h-11 rounded-xl bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-accent-muted hover:text-foreground transition-all font-semibold"
                    >
                      Close Details
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* === EDIT MODAL === */}
      <AnimatePresence>
        {editingIncident && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingIncident(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#18181b] to-[#0f0f12] border border-foreground/[0.1] shadow-2xl z-10"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4 border-b border-foreground/[0.08] bg-[#18181b]/95 backdrop-blur-xl rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                    <Edit3 size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">Edit Incident Post</h3>
                    <p className="text-[10px] text-accent-dim">Modify the field report metadata directly</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingIncident(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-foreground/10 transition-colors"
                >
                  <X size={16} className="text-accent-dim" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                
                {/* Description */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Description & Summary</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 resize-none transition-all h-28 font-sans"
                    placeholder="Describe the incident, details, resources required, and context..."
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
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                      placeholder="e.g. Sector 4, Hyderabad"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all appearance-none cursor-pointer"
                    >
                      {["Water", "Medical", "Food", "Shelter", "Evacuation", "Infrastructure", "Other"].map(c => (
                        <option key={c} value={c} className="bg-[#18181b]">{c}</option>
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
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all appearance-none cursor-pointer"
                    >
                      {["CRITICAL", "HIGH", "NORMAL"].map(p => (
                        <option key={p} value={p} className="bg-[#18181b]">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">
                      <Users size={10} className="inline mr-1" />Affected
                    </label>
                    <input
                      type="text"
                      value={editForm.affected}
                      onChange={(e) => setEditForm({ ...editForm, affected: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                      placeholder="e.g. 50+ people or Unknown"
                    />
                  </div>
                </div>

                {/* Volunteers Needed */}
                <div>
                  <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-1.5">Volunteers Needed</label>
                  <input
                    type="number"
                    value={editForm.volunteers_needed}
                    onChange={(e) => setEditForm({ ...editForm, volunteers_needed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                    min="0"
                  />
                </div>

                {/* Error Banner */}
                {editError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    {editError}
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex items-center gap-3 pt-4 border-t border-foreground/[0.08] bg-[#0f0f12]/95 backdrop-blur-xl rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setEditingIncident(null)}
                    className="flex-1 h-11 rounded-xl border border-foreground/[0.1] text-sm font-medium text-accent-dim hover:text-foreground hover:bg-foreground/[0.05] transition-all flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Cancel
                  </button>
                 <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-[2] h-11 rounded-xl bg-black text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
                  >
                    {isSavingEdit ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default function MyPostsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <NGOPostsInner />
    </Suspense>
  );
}
