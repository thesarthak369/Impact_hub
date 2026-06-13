"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, AlertTriangle, BrainCircuit, Users, MapPin, Clock, Check, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { collection, query, where, onSnapshot, writeBatch, doc, updateDoc } from "firebase/firestore";

interface Notification {
  id: string;
  type: "alert" | "ai" | "volunteer" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
  created_at: string;
}

const typeConfig = {
  alert: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ai: { icon: BrainCircuit, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  volunteer: { icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  system: { icon: Bell, color: "text-accent-dim", bg: "bg-foreground/[0.03] border-foreground/[0.06]" },
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      
      // Sort docs by created_at descending in JS
      docs.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      const mapped = docs.map((n: any) => ({
        id: n.id,
        type: n.type || 'system',
        title: n.title,
        body: n.body,
        time: getTimeAgo(n.created_at),
        read: n.read,
        created_at: n.created_at
      }));
      setNotifications(mapped);
      setLoading(false);
    }, (error) => {
      console.error("Notifications snapshot error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const markRead = async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };
  
  const markAllRead = async () => {
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          batch.update(doc(db, "notifications", n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };
  
  const clearRead = async () => {
    const toDelete = notifications.filter(x => x.read).map(x => x.id);
    setNotifications(n => n.filter(x => !x.read));
    if (toDelete.length === 0) return;
    try {
      const batch = writeBatch(db);
      toDelete.forEach(id => {
        batch.delete(doc(db, "notifications", id));
      });
      await batch.commit();
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-foreground text-background text-xs font-bold">{unreadCount}</span>
              )}
            </h1>
            <p className="text-sm text-accent-dim mt-0.5">Real-time alerts from AI, volunteers, and incidents.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="px-3 py-1.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-xs text-accent-muted hover:text-foreground transition-colors flex items-center gap-1.5">
              <Check size={12} /> Mark All Read
            </button>
            <button onClick={clearRead} className="px-3 py-1.5 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-xs text-accent-muted hover:text-foreground transition-colors flex items-center gap-1.5">
              <Trash2 size={12} /> Clear Read
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {["all", "alert", "ai", "volunteer", "system"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${filter === f ? "bg-foreground text-background" : "text-accent-dim hover:text-foreground bg-foreground/[0.03] border border-foreground/[0.06]"}`}>
              {f === "ai" ? "AI" : f}
              {f !== "all" && <span className="ml-1 text-[10px] opacity-60">({notifications.filter(n => n.type === f).length})</span>}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-16 text-accent-dim">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-accent-dim">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications to show.</p>
            </div>
          ) : (
            filtered.map((n, i) => {
              const cfg = typeConfig[n.type];
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => markRead(n.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                    n.type === 'ai' && !n.read
                      ? "bg-indigo-500/[0.04] border-indigo-500/15 hover:border-indigo-500/25"
                      : n.read
                        ? "bg-foreground/[0.01] border-foreground/[0.04] hover:border-foreground/[0.08]"
                        : "bg-foreground/[0.03] border-foreground/[0.08] hover:border-foreground/15"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cfg.bg} border flex items-center justify-center shrink-0 mt-0.5`}>
                      <cfg.icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-medium ${n.read ? "text-accent-muted" : "text-foreground"}`}>{n.title}</span>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />}
                      </div>
                      <p className="text-xs text-accent-dim leading-relaxed">{n.body}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-accent-dim">
                        <Clock size={10} /> {n.time}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
