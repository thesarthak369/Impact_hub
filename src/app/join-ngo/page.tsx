"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CheckCircle2, AlertTriangle, ArrowRight, Shield, Sparkles, Users } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc } from "firebase/firestore";

function JoinNGOContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams?.get("code") || "";

  const [code, setCode] = useState(prefillCode);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ngoInfo, setNgoInfo] = useState<any>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    if (!user) {
      setError("You must be logged in to join an NGO.");
      setLoading(false);
      return;
    }

    try {
      // Find invite
      const invitesQ = query(
        collection(db, "ngo_invites"),
        where("code", "==", code.toUpperCase().trim())
      );
      const invitesSnap = await getDocs(invitesQ);
      if (invitesSnap.empty) {
        setError("Invalid invite code. Please check and try again.");
        setLoading(false);
        return;
      }
      
      const inviteDoc = invitesSnap.docs[0];
      const invite = { id: inviteDoc.id, ...inviteDoc.data() as any };

      // Load NGO profile
      const ngoDoc = await getDoc(doc(db, "profiles", invite.ngo_user_id));
      const ngoProfile = ngoDoc.exists() ? ngoDoc.data() as any : null;

      // Check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setError("This invite code has expired.");
        setLoading(false);
        return;
      }

      // Check usage
      if ((invite.uses || 0) >= (invite.max_uses || 10)) {
        setError("This invite code has reached its maximum uses.");
        setLoading(false);
        return;
      }

      // Check if already a member
      const memberQ = query(
        collection(db, "ngo_members"),
        where("ngo_user_id", "==", invite.ngo_user_id),
        where("member_user_id", "==", user.uid)
      );
      const memberSnap = await getDocs(memberQ);
      if (!memberSnap.empty) {
        setError("You are already a member of this NGO.");
        setLoading(false);
        return;
      }

      // Can't join own NGO
      if (invite.ngo_user_id === user.uid) {
        setError("You can't join your own NGO — you're already the owner!");
        setLoading(false);
        return;
      }

      // Add member
      await addDoc(collection(db, "ngo_members"), {
        ngo_user_id: invite.ngo_user_id,
        member_user_id: user.uid,
        role: 'member',
        joined_at: new Date().toISOString()
      });

      // Increment usage
      await updateDoc(doc(db, "ngo_invites", invite.id), { uses: (invite.uses || 0) + 1 });

      setNgoInfo({
        name: ngoProfile?.metadata?.orgName || ngoProfile?.name || 'NGO',
        avatar: ngoProfile?.avatar_url,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while joining the NGO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="volunteer">
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-green-500/[0.06] to-transparent border border-green-500/20 text-center glass-panel relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                >
                  <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2 text-foreground">Welcome to the Team!</h2>
                <p className="text-sm text-accent-dim mb-1">You've joined <span className="text-foreground font-semibold">{ngoInfo?.name}</span></p>
                <p className="text-xs text-accent-dim mb-6">You can now view team updates and collaborate on incidents.</p>
                <button
                  onClick={() => router.push('/volunteer-dashboard')}
                  className="h-11 px-6 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:bg-foreground/80 active:scale-[0.98] transition-all"
                >
                  Go to Dashboard <ArrowRight size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-foreground/[0.04] to-transparent border border-foreground/[0.08] glass-panel relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-foreground/5 blur-[50px] rounded-full pointer-events-none" />
                
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-foreground/10 border border-foreground/20 flex items-center justify-center mx-auto mb-4">
                    <Users size={24} className="text-foreground" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-1">Join an NGO</h1>
                  <p className="text-sm text-accent-dim">Enter the invite code shared by your NGO to join their team.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-accent-dim uppercase tracking-wider mb-1.5 font-medium">Invite Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC123"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-background/50 border border-foreground/[0.1] text-lg text-center font-mono font-bold tracking-[0.3em] text-foreground placeholder:text-accent-muted focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={loading || code.trim().length < 4}
                    className="w-full h-12 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-foreground/80 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-background/20 border-t-black rounded-full" /> Verifying...</>
                    ) : (
                      <><UserPlus size={16} /> Join NGO</>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2"
                    >
                      <AlertTriangle size={14} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <p className="text-[10px] text-accent-dim flex items-center justify-center gap-1">
                    <Shield size={10} /> Your data is protected. Only the NGO owner can see your membership.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default function JoinNGOPage() {
  return (
    <Suspense fallback={
      <DashboardLayout role="volunteer">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <JoinNGOContent />
    </Suspense>
  );
}
