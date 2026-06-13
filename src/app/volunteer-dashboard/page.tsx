"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CheckCircle2, Star, ArrowRight, Zap, Trophy, Target, Heart, Navigation2, BrainCircuit, X, Sparkles, Shield, Bell, XCircle } from "lucide-react";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db, storage } from "@/lib/firebase/client";
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, 
  onSnapshot, setDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface AIBriefing {
  location: string;
  category: string;
  priority: string;
  affected: string;
  description: string;
  summary: string;
  recommended_action: string;
  confidence_score: number;
}

function VolunteerDashboardInner() {
  const [status, setStatus] = useState<"available" | "busy" | "offline">("available");
  const [acceptedMission, setAcceptedMission] = useState<string | null>(null);
  
  const [availableMissions, setAvailableMissions] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [deploymentTab, setDeploymentTab] = useState<"active" | "completed">("active");
  const [myNgoIds, setMyNgoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    missionsComplete: "0",
    peopleHelped: "0",
    hoursVolunteered: "0",
    impactScore: "0",
  });
  
  const [showAIBriefing, setShowAIBriefing] = useState(false);
  const [aiBriefingData, setAiBriefingData] = useState<AIBriefing | null>(null);
  const [pendingDeployId, setPendingDeployId] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  
  // Credits & Modals
  const [volCredits, setVolCredits] = useState<number>(0);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileUrl, setProofFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("q")?.toLowerCase() || "";
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    userIdRef.current = user.uid;
    fetchData(user.uid);

    // Set up realtime subscriptions
    const unsubscribeIncidents = onSnapshot(collection(db, "incidents"), () => {
      if (userIdRef.current) fetchData(userIdRef.current);
    });
    const unsubscribeMissions = onSnapshot(collection(db, "missions"), () => {
      if (userIdRef.current) fetchData(userIdRef.current);
    });
    const unsubscribeNotifications = onSnapshot(collection(db, "notifications"), () => {
      if (userIdRef.current) fetchAISuggestions(userIdRef.current);
    });
      
    return () => {
      unsubscribeIncidents();
      unsubscribeMissions();
      unsubscribeNotifications();
    };
  }, [user]);

  const fetchData = async (userId: string) => {
    try {
      // Fetch volunteer profile to get credits
      const profileSnap = await getDoc(doc(db, "profiles", userId));
      if (profileSnap.exists()) {
        setVolCredits(profileSnap.data().credits || 0);
      }

      // Fetch Active Incidents not yet resolved
      const incidentsSnap = await getDocs(
        query(collection(db, "incidents"), orderBy("created_at", "desc"))
      );
      
      const incList: any[] = [];
      const profileCache: { [key: string]: any } = {};

      for (const incDoc of incidentsSnap.docs) {
        const inc = { id: incDoc.id, ...incDoc.data() } as any;
        if (inc.status === "Resolved") continue;

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
        const mSnap = await getDocs(
          query(collection(db, "missions"), where("incident_id", "==", incDoc.id))
        );
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
      setAvailableMissions(incList);

      // Fetch my NGO memberships
      const membershipSnap = await getDocs(
        query(collection(db, "ngo_members"), where("member_user_id", "==", userId))
      );
      setMyNgoIds(membershipSnap.docs.map(doc => doc.data().ngo_user_id));

      // Fetch AI suggestions (notifications)
      fetchAISuggestions(userId);

      // Fetch My Active Missions and completed ones
      const myMissionsSnap = await getDocs(
        query(collection(db, "missions"), where("volunteer_id", "==", userId))
      );
      
      const activeList: any[] = [];
      const completedList: any[] = [];
      const allMissionsList: any[] = [];

      for (const mDoc of myMissionsSnap.docs) {
        const mData = { id: mDoc.id, ...mDoc.data() } as any;
        if (mData.incident_id) {
          const incDoc = await getDoc(doc(db, "incidents", mData.incident_id));
          if (incDoc.exists()) {
            mData.incident = incDoc.data();
          }
        }
        allMissionsList.push(mData);
        if (mData.status !== "Completed") {
          activeList.push(mData);
        } else {
          completedList.push(mData);
        }
      }
      setActiveAssignments(activeList);
      setCompletedAssignments(completedList);

      // Calculate stats
      const completed = allMissionsList.filter((m: any) => m.status === 'Completed');
      const missionsComplete = completed.length;
      let peopleHelped = 0;
      completed.forEach((m: any) => {
        const affected = parseInt(m.incident?.affected || "0");
        if (!isNaN(affected)) peopleHelped += affected;
      });
      const hoursVolunteered = missionsComplete * 3;
      const impactScore = Math.min(100, 50 + (missionsComplete * 5));
      
      setStats({
        missionsComplete: missionsComplete.toString(),
        peopleHelped: peopleHelped.toLocaleString(),
        hoursVolunteered: hoursVolunteered.toString(),
        impactScore: impactScore.toString()
      });
    } catch (error) {
      console.error("Error fetching volunteer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = useMemo(() => {
    let filtered = availableMissions;
    if (searchQuery) {
      filtered = availableMissions.filter(mission => 
        mission.location?.toLowerCase().includes(searchQuery) ||
        mission.description?.toLowerCase().includes(searchQuery) ||
        mission.type?.toLowerCase().includes(searchQuery)
      );
    }
    
    // Sort so incidents from my affiliated NGOs are at the top
    return [...filtered].sort((a, b) => {
      const aIsMyNgo = myNgoIds.includes(a.created_by) ? 1 : 0;
      const bIsMyNgo = myNgoIds.includes(b.created_by) ? 1 : 0;
      if (aIsMyNgo !== bIsMyNgo) return bIsMyNgo - aIsMyNgo;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [availableMissions, searchQuery, myNgoIds]);

  const fetchAISuggestions = async (userId: string) => {
    try {
      const notifsSnap = await getDocs(
        query(
          collection(db, "notifications"),
          where("user_id", "==", userId),
          where("type", "==", "ai"),
          where("read", "==", false),
          orderBy("created_at", "desc"),
          limit(5)
        )
      );
      setAiSuggestions(notifsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const dismissSuggestion = async (id: string) => {
    try {
      await setDoc(doc(db, "notifications", id), { read: true }, { merge: true });
      setAiSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
    }
  };

  // When Deploy is clicked, show AI briefing first
  const handleDeployClick = async (incidentId: string) => {
    setPendingDeployId(incidentId);
    setBriefingLoading(true);
    setShowAIBriefing(true);
    
    const incident = availableMissions.find(m => m.id === incidentId);
    
    // Try to fetch NLP extraction for this incident
    try {
      const nlpSnap = await getDocs(
        query(collection(db, "nlp_extractions"), orderBy("created_at", "desc"), limit(20))
      );
      const extractions = nlpSnap.docs.map(doc => doc.data());

      // Find matching extraction by location
      let matchedExtraction: any = null;
      if (extractions && incident) {
        matchedExtraction = extractions.find((ext: any) => {
          const loc = ext.extracted_data?.location?.toLowerCase() || "";
          const incLoc = incident.location?.toLowerCase() || "";
          return loc === incLoc || loc.includes(incLoc) || incLoc.includes(loc);
        });
      }

      if (matchedExtraction?.extracted_data) {
        setAiBriefingData({
          location: matchedExtraction.extracted_data.location || incident?.location || "Unknown",
          category: matchedExtraction.extracted_data.category || incident?.type || "General",
          priority: matchedExtraction.extracted_data.priority || incident?.priority || "NORMAL",
          affected: matchedExtraction.extracted_data.affected_count || incident?.affected || "Unknown",
          description: incident?.description || matchedExtraction.extracted_data.summary || "",
          summary: matchedExtraction.extracted_data.summary || "",
          recommended_action: matchedExtraction.extracted_data.recommended_action || "Proceed to location and assess the situation",
          confidence_score: matchedExtraction.extracted_data.confidence_score || 85,
        });
      } else {
        // Use incident data directly
        setAiBriefingData({
          location: incident?.location || "Unknown",
          category: incident?.type || "General",
          priority: incident?.priority || "NORMAL",
          affected: incident?.affected || "Unknown",
          description: incident?.description || "",
          summary: incident?.description || "AI-analyzed incident requiring immediate response",
          recommended_action: "Proceed to the incident location, assess the situation, and coordinate with nearby volunteers",
          confidence_score: 78,
        });
      }
    } catch (error) {
      console.error("Error during deployment load:", error);
    } finally {
      setBriefingLoading(false);
    }
  };

  // Confirm deployment after AI briefing
  const confirmDeploy = async () => {
    if (!pendingDeployId || !user) return;
    
    try {
      // Prevent duplicate deployments
      const existingSnap = await getDocs(
        query(
          collection(db, "missions"),
          where("incident_id", "==", pendingDeployId),
          where("volunteer_id", "==", user.uid)
        )
      );
      
      if (!existingSnap.empty) {
        setShowAIBriefing(false);
        setPendingDeployId(null);
        return; // Already deployed
      }

      setAcceptedMission(pendingDeployId);
      setShowAIBriefing(false);
      
      // Create mission in Firestore
      const missionRef = doc(collection(db, "missions"));
      await setDoc(missionRef, {
        incident_id: pendingDeployId,
        volunteer_id: user.uid,
        status: 'In Progress',
        created_at: new Date().toISOString()
      });

      // Update incident status
      await setDoc(doc(db, "incidents", pendingDeployId), {
        status: 'In Transit'
      }, { merge: true });
      
      setTimeout(() => {
        setAcceptedMission(null);
        setPendingDeployId(null);
        fetchData(user.uid);
      }, 1000);
    } catch (error) {
      console.error("Error confirming deployment:", error);
    }
  };
  
  const completeMission = async () => {
    if (!user || !completingMissionId) return;
    
    try {
      setIsUploading(true);
      let proofUrl = null;
      if (proofFile) {
         const storageRef = ref(storage, `proofs/${completingMissionId}_${Date.now()}_${proofFile.name}`);
         await uploadBytes(storageRef, proofFile);
         proofUrl = await getDownloadURL(storageRef);
      }
      
      // Mark mission pending approval
      await setDoc(doc(db, "missions", completingMissionId), {
        status: 'Pending Approval',
        proof_text: proofText,
        ...(proofUrl ? { proof_url: proofUrl } : {})
      }, { merge: true });
      
      setShowProofModal(false);
      setProofText("");
      setProofFile(null);
      setProofFileUrl(null);
      setCompletingMissionId(null);
      setIsUploading(false);
      fetchData(user.uid);
    } catch (error) {
      console.error("Error submitting proof:", error);
      setIsUploading(false);
    }
  };

  const handleRedeem = async () => {
    setRedeemError("");
    if (!upiId.includes("@")) {
      setRedeemError("Please enter a valid UPI ID");
      return;
    }
    if (!user || volCredits <= 0) return;

    setIsRedeeming(true);
    try {
      // Deduct credits to 0 and save upi_id
      await setDoc(doc(db, "profiles", user.uid), { 
        credits: 0,
        last_upi_id: upiId 
      }, { merge: true });

      // Log redemption transaction
      const txRef = doc(collection(db, "credit_transactions"));
      await setDoc(txRef, {
        from_id: user.uid,
        to_id: "impact_hub_system",
        amount: volCredits,
        type: "redeem",
        upi_id: upiId,
        created_at: new Date().toISOString()
      });

      setVolCredits(0);
      setRedeemSuccess(true);
      setTimeout(() => {
        setRedeemSuccess(false);
        setShowRedeemModal(false);
        setUpiId("");
      }, 3000);
    } catch (error) {
      console.error("Redeem error:", error);
      setRedeemError("Failed to process redemption. Try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  };

  return (
    <DashboardLayout role="volunteer">
      <div className="p-6 md:p-8 max-w-7xl mx-auto font-helvetica space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Volunteer Operations</h1>
            <p className="text-sm text-accent-dim">Accept missions, deploy resources, and track field impact.</p>
          </div>
{/* 
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Volunteer Operations</h1>
            <p className="text-sm text-accent-dim">Accept missions, deploy resources, and track field impact.</p>
          </div> */}

          {/* Status & Redeem */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRedeemModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-bold hover:bg-green-500/20 transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]"
            >
              <Zap size={12} /> Redeem ₹{volCredits * 100}
            </button>
            <div className="flex items-center gap-1 p-1 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] backdrop-blur-sm shadow-lg">
              {(["available", "busy", "offline"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all capitalize ${
                    status === s
                      ? "bg-foreground text-background shadow-md"
                      : "text-accent-dim hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 relative z-10">
          {[
            { label: "Missions Complete", value: stats.missionsComplete, icon: Trophy, sub: "This month" },
            { label: "People Helped", value: stats.peopleHelped, icon: Heart, sub: "Total impact" },
            { label: "Wallet Credits", value: volCredits.toString(), icon: Zap, sub: `₹${volCredits * 100} Available` },
            { label: "Impact Score", value: stats.impactScore, icon: Star, sub: "Top 5%" },
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
                {stat.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Suggestions Banner */}
        <AnimatePresence>
          {aiSuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3 relative z-10">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BrainCircuit size={15} className="text-indigo-400" />
                AI Suggestions For You
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">{aiSuggestions.length} NEW</span>
              </h3>
              {aiSuggestions.map((sug, i) => (
                <motion.div key={sug.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <BrainCircuit size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground mb-0.5">{sug.title}</div>
                    <p className="text-xs text-accent-dim leading-relaxed line-clamp-2">{sug.body}</p>
                    <div className="text-[10px] text-accent-dim mt-1">{getTimeAgo(sug.created_at)}</div>
                  </div>
                  <button onClick={() => dismissSuggestion(sug.id)}
                    className="shrink-0 text-accent-dim hover:text-foreground p-1 rounded hover:bg-foreground/[0.04] transition-colors" title="Dismiss">
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid xl:grid-cols-5 gap-8 relative z-10">
          {/* Active Assignments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-lg">
                <Target size={18} className="text-accent-muted" />
                My Deployments
              </h2>
              <div className="flex bg-foreground/5 p-1 rounded-lg border border-foreground/10">
                <button 
                  onClick={() => setDeploymentTab('active')} 
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${deploymentTab === 'active' ? 'bg-background shadow text-foreground' : 'text-accent-dim hover:text-foreground'}`}
                >
                  Active ({activeAssignments.length})
                </button>
                <button 
                  onClick={() => setDeploymentTab('completed')} 
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${deploymentTab === 'completed' ? 'bg-background shadow text-foreground' : 'text-accent-dim hover:text-foreground'}`}
                >
                  Completed ({completedAssignments.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-accent-dim glass-panel rounded-2xl border border-foreground/[0.06]">Loading assignments...</div>
            ) : (deploymentTab === 'active' && activeAssignments.length === 0) || (deploymentTab === 'completed' && completedAssignments.length === 0) ? (
              <div className="p-8 flex flex-col items-center justify-center text-center text-xs text-accent-dim glass-panel rounded-2xl border border-foreground/[0.06]">
                <Navigation2 size={24} className="opacity-20 mb-3" />
                You have no {deploymentTab} missions.<br/>
                {deploymentTab === 'active' ? "Standby for deployment." : "Complete a mission to see it here."}
              </div>
            ) : (
              (deploymentTab === 'active' ? activeAssignments : completedAssignments).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-foreground/[0.04] to-transparent border border-foreground/[0.08] shadow-lg glass-panel relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${a.status === 'Completed' ? 'bg-green-500/50' : 'bg-indigo-500/50'}`} />
                  <div className="flex items-start justify-between mb-4 pl-2">
                    <div>
                      <div className="font-bold text-lg text-foreground mb-1 tracking-tight">{a.incident?.location || "Unknown"}</div>
                      <div className="text-xs text-accent-dim flex items-center gap-1.5">
                        <MapPin size={12} className="text-accent-muted" />
                        {a.incident?.type || "Mission"} • <span className="font-mono">{a.incident?.affected} affected</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                      a.status === 'Completed' 
                        ? 'text-green-400 bg-green-400/10 border-green-400/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : a.status === 'Pending Approval'
                        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                        : 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  {/* Complete Button */}
                  {a.status !== 'Completed' && (
                    <div className="mt-5 flex gap-2 pl-2">
                      {a.status === 'Pending Approval' ? (
                        <div className="w-full h-11 rounded-xl bg-foreground/5 text-accent-dim text-sm font-bold flex justify-center items-center border border-foreground/10">
                          <Clock size={16} className="mr-2" /> Pending NGO Approval
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setCompletingMissionId(a.id); setShowProofModal(true); }}
                          className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/80 text-sm font-bold flex justify-center items-center gap-2 transition-all hover:shadow-[0_0_20px_var(--shimmer-c)] active:scale-[0.98]"
                        >
                          <CheckCircle2 size={16} /> Upload Proof & Complete
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Available Missions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="xl:col-span-3 rounded-2xl bg-gradient-to-b from-foreground/[0.03] to-background border border-foreground/[0.08] shadow-2xl overflow-hidden flex flex-col glass-panel"
            id="missions"
          >
            <div className="p-6 border-b border-foreground/[0.06] flex justify-between items-center bg-foreground/[0.01]">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-lg">
                <Zap size={18} className="text-yellow-500" />
                Live Network Incidents
              </h2>
              <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-foreground/10">
                <span className="text-[10px] text-foreground font-mono font-bold tracking-widest">LIVE DATA</span>
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center text-sm text-accent-dim space-y-4">
                  <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  <span>Scanning local grid...</span>
                </div>
              ) : filteredMissions.length === 0 ? (
                 <div className="p-10 flex flex-col items-center justify-center text-sm text-accent-dim">
                   <Zap size={32} className="opacity-20 mb-3" />
                   No active incidents match your criteria.
                 </div>
              ) : (
                <div className="space-y-2">
                  {filteredMissions.map((mission, i) => {
                    const volunteersNeeded = mission.volunteers_needed || 0;
                    const volunteersApplied = mission.missions?.length || 0;
                    const isFull = volunteersNeeded > 0 && volunteersApplied >= volunteersNeeded;
                    const isMyNgo = myNgoIds.includes(mission.created_by);

                    return (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      key={mission.id} 
                      className={`group p-5 rounded-xl border transition-all ${isMyNgo ? 'bg-indigo-500/[0.04] border-indigo-500/20 hover:border-indigo-500/40' : 'hover:bg-foreground/[0.04] border-transparent hover:border-foreground/[0.06]'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-foreground text-lg">{mission.location}</span>
                            {isMyNgo && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                                <Shield size={10} /> YOUR NGO
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${
                              mission.priority === "CRITICAL" ? "bg-foreground/10 text-foreground border-foreground/20 shadow-[0_0_10px_var(--glass-border)]" :
                              mission.priority === "HIGH" ? "bg-foreground/[0.06] text-foreground/70 border-foreground/10" :
                              "bg-foreground/[0.03] text-accent-dim border-foreground/[0.06]"
                            }`}>
                              {mission.priority}
                            </span>
                          </div>
                          <div className="text-sm text-accent-dim mb-3 line-clamp-1">{mission.description || mission.type}</div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-[10px] bg-foreground/5 text-accent-dim px-1.5 py-0.5 rounded">
                              NGO: {mission.profiles?.metadata?.orgName || mission.profiles?.name || "Unknown"}
                            </span>
                            {volunteersNeeded > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isFull ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {volunteersApplied} / {volunteersNeeded} Volunteers
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[11px] font-medium text-accent-muted bg-foreground/[0.02] inline-flex px-3 py-1.5 rounded-lg border border-foreground/[0.04]">
                            <span className="flex items-center gap-1.5"><Clock size={12} /> {getTimeAgo(mission.created_at)}</span>
                            <span className="w-px h-3 bg-foreground/10" />
                            <span className="font-mono">👥 {mission.affected} affected</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeployClick(mission.id)}
                          disabled={acceptedMission === mission.id || mission.status === 'In Transit' || (isFull && acceptedMission !== mission.id)}
                          className={`shrink-0 h-11 px-6 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.95] ${
                            acceptedMission === mission.id
                              ? "bg-foreground/10 text-foreground border border-foreground/20"
                              : mission.status === 'In Transit' 
                              ? "bg-foreground/[0.05] text-accent-dim cursor-not-allowed border border-foreground/[0.05]"
                              : isFull
                              ? "bg-foreground/[0.05] text-accent-dim cursor-not-allowed border border-foreground/[0.05]"
                              : "bg-foreground text-background hover:bg-foreground/80 hover:shadow-[0_0_15px_var(--shimmer-b)] group-hover:scale-105"
                          }`}
                        >
                          {acceptedMission === mission.id ? (
                            <><CheckCircle2 size={16} /> Deploying</>
                          ) : mission.status === 'In Transit' ? (
                            <>Dispatched</>
                          ) : isFull ? (
                            <>Capacity Reached</>
                          ) : (
                            <><BrainCircuit size={14} /> Deploy <ArrowRight size={16} /></>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );})}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Briefing Modal */}
      <AnimatePresence>
        {showAIBriefing && (
          <div className="fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div 
              className="fixed inset-0 overflow-y-auto"
              onClick={() => { setShowAIBriefing(false); setPendingDeployId(null); }}
            >
              <div className="flex min-h-full items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-background border border-foreground/10 rounded-2xl shadow-2xl my-8 overflow-hidden"
                >
              {/* Header glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-20 bg-foreground/5 blur-[40px] rounded-full pointer-events-none" />

              <div className="p-6 border-b border-foreground/[0.06] flex items-center justify-between relative shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-foreground/10 border border-foreground/20 flex items-center justify-center">
                    <BrainCircuit size={16} className="text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">AI Mission Briefing</h3>
                    <p className="text-[10px] text-accent-dim">Powered by Gemini — review before deploying</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAIBriefing(false); setPendingDeployId(null); }}
                  className="w-8 h-8 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center text-accent-dim hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {briefingLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-accent-dim text-sm space-y-3">
                  <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  <span>Loading AI analysis...</span>
                </div>
              ) : aiBriefingData ? (
                <div className="p-6 space-y-4 overflow-y-auto">
                  {/* Key data */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                      <div className={`text-base font-bold ${aiBriefingData.priority === 'CRITICAL' ? 'text-foreground' : 'text-accent-muted'}`}>{aiBriefingData.priority}</div>
                      <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Priority</div>
                    </div>
                    <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                      <div className="text-base font-bold">{aiBriefingData.affected}</div>
                      <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">Affected</div>
                    </div>
                    <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-center">
                      <div className="text-base font-bold">{aiBriefingData.confidence_score}%</div>
                      <div className="text-[9px] text-accent-dim uppercase tracking-wider mt-0.5">AI Confidence</div>
                    </div>
                  </div>

                  {/* Location & Category */}
                  <div className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-accent-dim">Location</span>
                      <span className="text-foreground font-medium">{aiBriefingData.location}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-foreground/[0.03] pt-2.5">
                      <span className="text-accent-dim">Category</span>
                      <span className="text-foreground font-medium">{aiBriefingData.category}</span>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {aiBriefingData.summary && (
                    <div className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04]">
                      <div className="text-[10px] text-accent-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles size={10} className="text-foreground" /> AI Summary
                      </div>
                      <p className="text-xs text-accent-muted leading-relaxed">{aiBriefingData.summary}</p>
                    </div>
                  )}

                  {/* Recommended Action */}
                  <div className="p-4 rounded-xl bg-foreground/[0.04] border border-foreground/[0.08]">
                    <div className="text-[10px] text-accent-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield size={10} className="text-foreground" /> Recommended Action
                    </div>
                    <p className="text-xs text-foreground font-medium leading-relaxed">{aiBriefingData.recommended_action}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setShowAIBriefing(false); setPendingDeployId(null); }}
                      className="flex-1 h-11 rounded-xl bg-foreground/[0.04] border border-foreground/[0.08] text-sm font-medium text-accent-muted hover:text-foreground transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeploy}
                      className="flex-1 h-11 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-foreground/80 hover:shadow-[0_0_20px_var(--shimmer-c)] active:scale-[0.98] transition-all"
                    >
                      <Zap size={14} /> Confirm Deploy
                    </button>
                  </div>
                </div>
              ) : null}
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof Upload Modal */}
      <AnimatePresence>
        {showProofModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProofModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-background border border-foreground/10 rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-lg mb-2">Upload Proof of Work</h3>
              <p className="text-xs text-accent-dim mb-4">Describe the work completed or paste links to images. The NGO will approve this to release your credits.</p>
              
              <textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="e.g. Distributed 50 water bottles."
                className="w-full h-24 px-4 py-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.1] text-sm text-foreground placeholder:text-accent-muted focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 resize-none mb-4"
              />
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-accent-dim mb-2 uppercase">Image Proof</label>
                {proofFileUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-foreground/10 bg-black">
                    <img src={proofFileUrl} alt="Proof preview" className="w-full h-32 object-cover opacity-80" />
                    <button 
                      onClick={() => { setProofFile(null); setProofFileUrl(null); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-foreground/[0.08] border-dashed rounded-xl cursor-pointer bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-all">
                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                      <p className="text-xs text-accent-muted font-bold mt-2">Click to upload image</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setProofFile(e.target.files[0]);
                          setProofFileUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }} 
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowProofModal(false);
                    setProofFile(null);
                    setProofFileUrl(null);
                  }} 
                  className="flex-1 h-11 rounded-xl bg-foreground/[0.04] text-sm font-medium hover:bg-foreground/[0.08] transition-all"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button 
                  onClick={completeMission} 
                  disabled={!proofText.trim() && !proofFile || isUploading} 
                  className="flex-[2] h-11 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-foreground/80 disabled:opacity-50 transition-all"
                >
                  {isUploading ? (
                    <><div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Submit Proof</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Redeem Modal */}
      <AnimatePresence>
        {showRedeemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRedeemModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm bg-background border border-foreground/10 rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Zap size={18} className="text-green-500" /> Redeem Credits</h3>
              <p className="text-xs text-accent-dim mb-6">Convert your Impact Hub credits to real money.</p>
              
              <div className="bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl p-4 mb-6 flex flex-col items-center">
                <div className="text-[10px] text-accent-dim uppercase tracking-widest font-bold mb-1">Available Balance</div>
                <div className="text-3xl font-bold">₹{volCredits * 100}</div>
                <div className="text-[10px] text-accent-muted mt-1">{volCredits} Credits</div>
              </div>

              {redeemSuccess ? (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 font-medium text-center flex flex-col items-center gap-2">
                  <CheckCircle2 size={24} />
                  Redemption requested successfully! It will be processed soon.
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-[10px] text-accent-dim font-bold uppercase tracking-widest mb-2">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => { setUpiId(e.target.value); setRedeemError(""); }}
                      placeholder="e.g. 9876543210@ybl"
                      className="w-full px-4 py-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.1] text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                    {redeemError && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                        <XCircle size={12} /> {redeemError}
                      </p>
                    )}
                  </div>
                  
                  <button onClick={handleRedeem} disabled={volCredits <= 0 || !upiId.trim() || isRedeeming} className="w-full h-11 rounded-xl bg-green-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    {isRedeeming ? "Processing..." : `Withdraw ₹${volCredits * 100}`}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default function VolunteerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <VolunteerDashboardInner />
    </Suspense>
  );
}
