"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, TrendingDown, Download, Trophy, Clock, Users, FileText, ArrowUpRight, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";

interface WeeklyData {
  week: string;
  resolved: number;
  reported: number;
}

interface ResourceType {
  type: string;
  pct: number;
  count: number;
}

interface ResponseTime {
  month: string;
  time: number;
}

interface TopVolunteer {
  rank: number;
  name: string;
  avatar_url?: string;
  missions: number;
  hours: number;
  score: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTime[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<TopVolunteer[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: "0",
    resolutionRate: "0%",
    avgResponse: "—",
    activeVolunteers: "0",
  });

  useEffect(() => {
    fetchAllReportData();
  }, []);

  const fetchAllReportData = async () => {
    try {
      // === 1. Fetch all incidents ===
      const incsSnap = await getDocs(collection(db, "incidents"));
      const incidents = incsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      // Sort incidents by created_at ascending to match original logic
      incidents.sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tA - tB;
      });

      const totalIncidents = incidents.length;
      const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
      const resolutionRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : "0";

      // === 2. Fetch all missions ===
      const missionsSnap = await getDocs(collection(db, "missions"));
      const missionsRaw = missionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      // Sort missions by created_at ascending
      missionsRaw.sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tA - tB;
      });

      // Map incident created_at and affected nested properties for metrics
      const missions = missionsRaw.map((m: any) => {
        const inc = incidents.find((i: any) => i.id === m.incident_id);
        return {
          ...m,
          incident: inc ? { created_at: inc.created_at, affected: inc.affected } : null
        };
      });

      // === 3. Fetch volunteer profiles ===
      const profilesSnap = await getDocs(collection(db, "profiles"));
      const volunteers = profilesSnap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any))
        .filter((p: any) => p.role === "volunteer");

      // === SUMMARY STATS ===
      // Calculate average response time (incident created -> mission created)
      let totalResponseMinutes = 0;
      let responseCount = 0;
      missions.forEach((m: any) => {
        if (m.incident?.created_at && m.created_at) {
          const incidentTime = new Date(m.incident.created_at).getTime();
          const missionTime = new Date(m.created_at).getTime();
          const diffMinutes = (missionTime - incidentTime) / 60000;
          if (diffMinutes > 0 && diffMinutes < 1440) { // only if within 24h
            totalResponseMinutes += diffMinutes;
            responseCount++;
          }
        }
      });
      const avgResponseMin = responseCount > 0 ? (totalResponseMinutes / responseCount).toFixed(1) : "—";

      setSummaryStats({
        totalIncidents: totalIncidents.toString(),
        resolutionRate: `${resolutionRate}%`,
        avgResponse: avgResponseMin !== "—" ? `${avgResponseMin}m` : "—",
        activeVolunteers: volunteers.length.toString(),
      });

      // === WEEKLY DATA ===
      const weekMap = new Map<string, { reported: number; resolved: number }>();
      const now = new Date();
      // Generate last 8 weeks
      for (let w = 7; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (w * 7));
        const weekLabel = `W${8 - w}`;
        weekMap.set(weekLabel, { reported: 0, resolved: 0 });
      }

      incidents.forEach(inc => {
        const incDate = new Date(inc.created_at);
        const daysAgo = Math.floor((now.getTime() - incDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.floor(daysAgo / 7);
        if (weekIdx >= 0 && weekIdx < 8) {
          const weekLabel = `W${8 - weekIdx}`;
          const entry = weekMap.get(weekLabel);
          if (entry) {
            entry.reported++;
            if (inc.status === 'Resolved') entry.resolved++;
          }
        }
      });

      const weeklyArr: WeeklyData[] = [];
      weekMap.forEach((val, key) => {
        weeklyArr.push({ week: key, reported: val.reported, resolved: val.resolved });
      });
      setWeeklyData(weeklyArr);

      // === RESOURCE DISTRIBUTION ===
      const typeCount = new Map<string, number>();
      const categories = ["Water", "Medical", "Food", "Shelter", "Evacuation", "Infrastructure", "Other"];
      categories.forEach(c => typeCount.set(c, 0));

      incidents.forEach(inc => {
        const type = inc.type || "Other";
        const matched = categories.find(c => type.toLowerCase().includes(c.toLowerCase()));
        const key = matched || "Other";
        typeCount.set(key, (typeCount.get(key) || 0) + 1);
      });

      const totalCategorized = Array.from(typeCount.values()).reduce((a, b) => a + b, 0);
      const resourceArr: ResourceType[] = [];
      typeCount.forEach((count, type) => {
        if (count > 0) {
          resourceArr.push({
            type,
            count,
            pct: totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0,
          });
        }
      });
      resourceArr.sort((a, b) => b.pct - a.pct);
      setResourceTypes(resourceArr.length > 0 ? resourceArr : [{ type: "No Data", count: 0, pct: 100 }]);

      // === RESPONSE TIMES BY MONTH ===
      const monthMap = new Map<string, { totalMin: number; count: number }>();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      missions.forEach((m: any) => {
        if (m.incident?.created_at && m.created_at) {
          const mDate = new Date(m.created_at);
          const monthKey = monthNames[mDate.getMonth()];
          const incidentTime = new Date(m.incident.created_at).getTime();
          const missionTime = mDate.getTime();
          const diffMin = (missionTime - incidentTime) / 60000;
          if (diffMin > 0 && diffMin < 1440) {
            const entry = monthMap.get(monthKey) || { totalMin: 0, count: 0 };
            entry.totalMin += diffMin;
            entry.count++;
            monthMap.set(monthKey, entry);
          }
        }
      });

      const responseArr: ResponseTime[] = [];
      monthMap.forEach((val, month) => {
        responseArr.push({
          month,
          time: parseFloat((val.totalMin / val.count).toFixed(1)),
        });
      });

      // If no real data, show current month with avg
      if (responseArr.length === 0 && avgResponseMin !== "—") {
        responseArr.push({ month: monthNames[now.getMonth()], time: parseFloat(avgResponseMin) });
      }
      setResponseTimes(responseArr);

      // === TOP VOLUNTEERS ===
      const volunteerMissionCount = new Map<string, { name: string; avatar_url?: string; missions: number; peopleHelped: number }>();

      missions.forEach((m: any) => {
        const vid = m.volunteer_id;
        if (!vid) return;
        const entry = volunteerMissionCount.get(vid) || { name: "", avatar_url: "", missions: 0, peopleHelped: 0 };
        entry.missions++;
        const affected = parseInt(m.incident?.affected || "0");
        if (!isNaN(affected)) entry.peopleHelped += affected;
        volunteerMissionCount.set(vid, entry);
      });

      // Map volunteer names
      volunteers.forEach((v: any) => {
        const entry = volunteerMissionCount.get(v.id);
        if (entry) {
          entry.name = v.full_name || v.metadata?.full_name || v.name || v.metadata?.name || v.email?.split('@')[0] || "Volunteer";
          entry.avatar_url = v.avatar_url;
        }
      });

      const topArr: TopVolunteer[] = [];
      let rank = 1;
      const sorted = Array.from(volunteerMissionCount.entries()).sort((a, b) => b[1].missions - a[1].missions);
      sorted.slice(0, 10).forEach(([, val]) => {
        if (val.name) {
          topArr.push({
            rank: rank++,
            name: val.name,
            avatar_url: val.avatar_url,
            missions: val.missions,
            hours: val.missions * 3, // estimated 3 hours per mission
            score: Math.min(100, 50 + (val.missions * 5)),
          });
        }
      });
      setTopVolunteers(topArr);

    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const maxResolved = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => Math.max(d.resolved, d.reported)), 1) : 1;
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes.map(r => r.time), 1) : 1;

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col items-center justify-center h-[60vh] text-accent-dim text-sm space-y-4">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <span>Generating impact reports from live data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Impact Reports</h1>
            <p className="text-sm text-accent-dim">Analytics and performance metrics — powered by live Firestore data.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.08] text-[10px] text-foreground font-bold">
              <Activity size={12} className="text-green-400" />
              LIVE DATA
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Incidents", value: summaryStats.totalIncidents, icon: BarChart3, trend: "From Firestore" },
            { label: "Resolution Rate", value: summaryStats.resolutionRate, icon: TrendingDown, trend: "Resolved / Total" },
            { label: "Avg Response", value: summaryStats.avgResponse, icon: Clock, trend: "Time to first deploy" },
            { label: "Registered Volunteers", value: summaryStats.activeVolunteers, icon: Users, trend: "Total signed up" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="p-5 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] hover:border-foreground/[0.1] transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-accent-dim font-medium">{s.label}</span>
                <s.icon size={15} className="text-accent-dim group-hover:text-accent-muted transition-colors" />
              </div>
              <div className="text-2xl font-bold tracking-tight mb-1">{s.value}</div>
              <div className="text-[11px] text-accent-dim">{s.trend}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          {/* Incidents Over Time — Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="xl:col-span-2 p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-6 flex items-center gap-2 text-sm tracking-tight">
              <BarChart3 size={15} className="text-accent-muted" />Incidents Over Time
              <span className="text-[9px] bg-foreground/10 px-2 py-0.5 rounded ml-auto font-mono tracking-widest">LAST 8 WEEKS</span>
            </h2>
            {weeklyData.some(d => d.reported > 0) ? (
              <>
                <div className="flex items-end gap-3 h-48">
                  {weeklyData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: "100%" }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.reported / maxResolved) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.08 }}
                          className="flex-1 bg-foreground/[0.08] rounded-t" title={`Reported: ${d.reported}`} />
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.resolved / maxResolved) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.08 + 0.1 }}
                          className="flex-1 bg-foreground/30 rounded-t" title={`Resolved: ${d.resolved}`} />
                      </div>
                      <span className="text-[10px] text-accent-dim mt-1">{d.week}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-[10px] text-accent-dim">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-foreground/[0.08]" />Reported</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-foreground/30" />Resolved</span>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-accent-dim text-sm">
                <span>No incident data yet. Submit field reports to populate this chart.</span>
              </div>
            )}
          </motion.div>

          {/* Resource Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-6 text-sm tracking-tight">Resource Distribution</h2>
            <div className="space-y-4">
              {resourceTypes.map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-accent-muted">{r.type}</span>
                    <span className="text-foreground font-mono">{r.pct}% <span className="text-accent-dim text-[10px]">({r.count})</span></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.15 }}
                      className="h-full rounded-full bg-gradient-to-r from-gray-500 to-white" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Response Time Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="p-6 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06]">
            <h2 className="font-semibold mb-6 flex items-center gap-2 text-sm tracking-tight">
              <TrendingDown size={15} className="text-accent-muted" />Response Time Trend
            </h2>
            {responseTimes.length > 0 ? (
              <>
                <div className="flex items-end gap-4 h-32">
                  {responseTimes.map((r, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(r.time / maxResponseTime) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.15 }}
                        className="w-full bg-gradient-to-t from-white/20 to-white/5 rounded-t relative">
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-accent-muted font-mono">{r.time}m</span>
                      </motion.div>
                      <span className="text-[10px] text-accent-dim mt-2">{r.month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] text-center">
                  <span className="text-xs text-accent-muted">Calculated from incident → first volunteer deployment</span>
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-accent-dim text-xs">
                Deploy to missions to generate response time data.
              </div>
            )}
          </motion.div>

          {/* Top Volunteers Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="xl:col-span-2 rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] overflow-hidden">
            <div className="p-5 border-b border-foreground/[0.04] flex justify-between items-center">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-sm"><Trophy size={15} className="text-accent-muted" />Top Volunteers</h2>
              <span className="text-[9px] bg-foreground/10 px-2 py-0.5 rounded font-mono tracking-widest">FROM FIRESTORE</span>
            </div>
            {topVolunteers.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-[10px] text-accent-dim bg-foreground/[0.01] border-b border-foreground/[0.04] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">#</th>
                    <th className="px-5 py-3 text-left font-medium">Volunteer</th>
                    <th className="px-5 py-3 text-left font-medium">Missions</th>
                    <th className="px-5 py-3 text-left font-medium">Hours</th>
                    <th className="px-5 py-3 text-left font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {topVolunteers.map(v => (
                    <tr key={v.rank} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-accent-dim">{v.rank}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {v.avatar_url ? (
                            <img src={v.avatar_url} alt="" className="w-7 h-7 rounded-full border border-foreground/10" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 border border-foreground/10 flex items-center justify-center text-[10px] font-bold">{v.name.charAt(0)}</div>
                          )}
                          <span className="font-medium">{v.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-accent-muted font-mono">{v.missions}</td>
                      <td className="px-5 py-3.5 text-accent-muted font-mono">{v.hours}h</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded bg-foreground/[0.06] border border-foreground/[0.08] text-xs font-bold">{v.score}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-accent-dim text-sm">
                <Trophy size={28} className="mx-auto mb-3 opacity-20" />
                No volunteer mission data yet. Deploy volunteers to populate the leaderboard.
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
