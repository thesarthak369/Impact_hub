"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, UserPlus, Copy, CheckCircle2, Trash2, Shield, Clock, Link2, AlertTriangle, Sparkles, UserCheck, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, addDoc } from "firebase/firestore";

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function NGOTeamPage() {
  const { user, role, metadata } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [deployedVolunteers, setDeployedVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load members
      const membersQ = query(
        collection(db, "ngo_members"),
        where("ngo_user_id", "==", user.uid)
      );
      const membersSnap = await getDocs(membersQ);
      const membersRaw = membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const resolvedMembers = await Promise.all(membersRaw.map(async (nm: any) => {
        if (!nm.member_user_id) return { ...nm, member: null };
        const mSnap = await getDoc(doc(db, "profiles", nm.member_user_id));
        return {
          ...nm,
          member: mSnap.exists() ? { id: mSnap.id, ...mSnap.data() } : null
        };
      }));
      
      // Sort members by joined_at ascending in JS
      resolvedMembers.sort((a: any, b: any) => {
        const tA = a.joined_at ? new Date(a.joined_at).getTime() : 0;
        const tB = b.joined_at ? new Date(b.joined_at).getTime() : 0;
        return tA - tB;
      });
      setMembers(resolvedMembers);

      // Load invite codes
      const invitesQ = query(
        collection(db, "ngo_invites"),
        where("ngo_user_id", "==", user.uid)
      );
      const invitesSnap = await getDocs(invitesQ);
      const invitesRaw = invitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      invitesRaw.sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      setInvites(invitesRaw);

      // Load currently deployed volunteers on this NGO's incidents
      const incsQ = query(
        collection(db, "incidents"),
        where("created_by", "==", user.uid)
      );
      const incsSnap = await getDocs(incsQ);
      const activeIncidents = incsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(inc => inc.status !== "Resolved");
      
      const activeIncIds = activeIncidents.map(inc => inc.id);

      if (activeIncIds.length > 0) {
        const missionsSnap = await getDocs(collection(db, "missions"));
        const activeMissions = missionsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(m => activeIncIds.includes(m.incident_id) && m.status !== "Completed");

        const vols: any[] = [];
        for (const m of activeMissions) {
          const profileSnap = await getDoc(doc(db, "profiles", m.volunteer_id));
          const profileData = profileSnap.exists() ? profileSnap.data() as any : null;
          const inc = activeIncidents.find(i => i.id === m.incident_id);
          vols.push({
            volunteer_id: m.volunteer_id,
            name: profileData?.metadata?.full_name || profileData?.name || 'Volunteer',
            avatar_url: profileData?.avatar_url,
            incident_location: inc?.location || 'Unknown',
            incident_type: inc?.type || 'General',
            status: m.status,
          });
        }
        setDeployedVolunteers(vols);
      } else {
        setDeployedVolunteers([]);
      }
    } catch (err) {
      console.error("Error loading NGO team data:", err);
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    if (!user) return;
    setCreating(true);
    setError("");

    const code = generateCode();

    try {
      await addDoc(collection(db, "ngo_invites"), {
        ngo_user_id: user.uid,
        code,
        max_uses: 10,
        uses: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join-ngo?code=${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from your NGO?')) return;
    try {
      await deleteDoc(doc(db, "ngo_members", memberId));
      loadData();
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "ngo_invites", inviteId));
      loadData();
    } catch (err) {
      console.error("Error deleting invite:", err);
    }
  };

  const orgName = metadata?.orgName || user?.displayName || 'Your NGO';

  return (
    <DashboardLayout role="ngo">
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-helvetica space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {orgName}
            </h1>
            <p className="text-sm text-accent-dim">Manage your team, invite members, and track active volunteers.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] text-xs text-foreground font-medium shadow-lg backdrop-blur-sm">
            <Users size={14} />
            {members.length + 1} Members
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 relative z-10">
          
          {/* LEFT COL: Owner + Members */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Owner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/[0.06] to-transparent border border-amber-500/15 glass-panel relative overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <Crown size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Owner</span>
              </div>
              <div className="flex items-center gap-4">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-amber-500/30" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/30 border-2 border-amber-500/30 flex items-center justify-center">
                    <Crown size={20} className="text-amber-400" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-foreground text-lg">{user?.displayName || 'Owner'}</div>
                  <div className="text-xs text-accent-dim">{user?.email}</div>
                  <div className="text-[10px] text-amber-400 mt-0.5 font-medium">{orgName} • Founder</div>
                </div>
              </div>
            </motion.div>

            {/* Members List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] glass-panel"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Users size={15} className="text-accent-muted" />
                  Team Members
                </h2>
                <span className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded-full font-bold">{members.length}</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-accent-dim">
                  <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-2" />
                  Loading team...
                </div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-accent-dim">
                  <UserPlus size={24} className="mx-auto mb-2 opacity-20" />
                  No members yet. Share an invite code to grow your team!
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] hover:border-foreground/[0.08] transition-all group"
                    >
                      {m.member?.avatar_url ? (
                        <img src={m.member.avatar_url} alt="" className="w-9 h-9 rounded-full border border-foreground/20" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-foreground/10 border border-foreground/20 flex items-center justify-center">
                          <Users size={14} className="text-accent-dim" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {m.member?.full_name || m.member?.metadata?.full_name || m.member?.name || m.member?.email || 'Member'}
                        </div>
                        <div className="text-[10px] text-accent-dim">{m.member?.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-accent-dim font-mono">
                          Joined {new Date(m.joined_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Active Volunteers on Your Incidents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] glass-panel"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Activity size={15} className="text-green-400" />
                  Active Volunteers
                </h2>
                <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                  {deployedVolunteers.length} DEPLOYED
                </span>
              </div>

              {deployedVolunteers.length === 0 ? (
                <div className="py-6 text-center text-xs text-accent-dim">
                  <Shield size={24} className="mx-auto mb-2 opacity-20" />
                  No volunteers currently deployed on your incidents.
                </div>
              ) : (
                <div className="space-y-2">
                  {deployedVolunteers.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/[0.03] border border-green-500/10">
                      {v.avatar_url ? (
                        <img src={v.avatar_url} alt="" className="w-8 h-8 rounded-full border border-green-500/30" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                          <UserCheck size={14} className="text-green-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{v.name}</div>
                        <div className="text-[10px] text-accent-dim">📍 {v.incident_location} • {v.incident_type}</div>
                      </div>
                      <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{v.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COL: Invite Codes */}
          <div className="space-y-6">
            {/* Generate Invite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-foreground/[0.04] to-transparent border border-foreground/[0.08] glass-panel relative overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-foreground/5 blur-[40px] rounded-full pointer-events-none" />
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <Link2 size={15} className="text-accent-muted" />
                Invite Link
                <Sparkles size={12} className="text-foreground ml-auto" />
              </h2>
              <p className="text-xs text-accent-dim mb-4 leading-relaxed">
                Generate an invite code and share it with your team. They can join by visiting the link or entering the code.
              </p>
              <button
                onClick={createInvite}
                disabled={creating}
                className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-foreground/80 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {creating ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-background/20 border-t-black rounded-full" /> Generating...</>
                ) : (
                  <><UserPlus size={16} /> Generate Invite Code</>
                )}
              </button>
              
              {error && (
                <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
            </motion.div>

            {/* Active Invites */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.06] glass-panel"
            >
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Shield size={14} className="text-accent-muted" />
                Active Codes
              </h3>
              {invites.length === 0 ? (
                <div className="py-4 text-center text-xs text-accent-dim">
                  No invite codes yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    const isFull = inv.uses >= inv.max_uses;
                    return (
                      <div key={inv.id} className={`p-3 rounded-xl border ${isExpired || isFull ? 'border-foreground/[0.04] opacity-50' : 'border-foreground/[0.08] bg-foreground/[0.02]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-bold font-mono tracking-widest text-foreground">{inv.code}</code>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyCode(inv.code)}
                              className="text-accent-dim hover:text-foreground p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-all"
                              title="Copy invite link"
                            >
                              {copiedCode === inv.code ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => deleteInvite(inv.id)}
                              className="text-red-400/50 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-accent-dim">
                          <span>{inv.uses} / {inv.max_uses} used</span>
                          <span className="w-px h-3 bg-foreground/10" />
                          <span className="flex items-center gap-1">
                            <Clock size={9} />
                            {isExpired ? 'Expired' : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
