/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { MapPin, AlertTriangle, CheckCircle2, Clock, Users, Flame, Layers } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "@/lib/firebase/client";
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { APIProvider, Map, Marker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MAP_STYLES } from "./map-styles";

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Geocode cache
const geocodeCache: Record<string, [number, number]> = {};

// Fallback generator for completely unknown locations
function getFallbackCoords(index: number): [number, number] {
  const idx = index || 0;
  return [22.0 + ((idx * 7 + 3) % 20) * 0.3, 78.0 + ((idx * 11 + 5) % 20) * 0.3];
}

function getCoords(location: string, lat?: number, lng?: number, index?: number): [number, number] {
  if (lat && lng && lat !== 0 && lng !== 0) return [lat, lng];
  const key = (location || "").toLowerCase().trim();
  if (geocodeCache[key]) {
    const c = geocodeCache[key];
    const j = (index || 0) * 0.003; // Slight jitter so markers don't overlap exactly
    return [c[0] + j, c[1] + j];
  }
  return getFallbackCoords(index || 0);
}

function MapCircle({ center, radius, fillColor, fillOpacity }: any) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const c = new google.maps.Circle({
      center,
      radius,
      fillColor,
      fillOpacity,
      strokeWeight: 0,
      map,
      clickable: false,
    });
    return () => {
      c.setMap(null);
    };
  }, [map, center, radius, fillColor, fillOpacity]);
  return null;
}

function IncidentMarker({ inc, i, selectedIncident, setSelectedIncident }: any) {
  const [lat, lng] = getCoords(inc.location, inc.lat, inc.lng, i);
  const color = inc.priority === "CRITICAL" ? "#b91c1c" : inc.priority === "HIGH" ? "#b45309" : "#15803d";
  const fillColor = inc.priority === "CRITICAL" ? "#dc2626" : inc.priority === "HIGH" ? "#d97706" : "#22c55e";
  const radius = inc.priority === "CRITICAL" ? 10 : inc.priority === "HIGH" ? 7 : 5;
  
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedIncident === inc.id;
  const showPopup = hovered || isSelected;

  const deployedVols = inc.deployed_volunteers || [];
  
  // Custom SVG icon for Marker
  const svgIcon = {
    path: typeof google !== 'undefined' ? google.maps.SymbolPath.CIRCLE : 0,
    fillColor,
    fillOpacity: inc.priority === "CRITICAL" ? 0.85 : 0.65,
    scale: radius,
    strokeColor: color,
    strokeWeight: 2,
  };

  return (
    <>
      <Marker
        position={{ lat, lng }}
        icon={svgIcon}
        onClick={() => setSelectedIncident(inc.id)}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        zIndex={isSelected ? 1000 : 1}
      />

      {showPopup && (
        <InfoWindow
          position={{ lat, lng }}
          onCloseClick={() => { setHovered(false); setSelectedIncident(null); }}
          headerDisabled
        >
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", color: "#fff", minWidth: "200px", padding: "12px", background: "transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>{inc.location}</div>
              {isSelected && (
                <button onClick={() => setSelectedIncident(null)} style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: "12px", padding: "0 0 4px 4px" }}>✕</button>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>{inc.type || 'General'}</div>
            {inc.ngo_name && <div style={{ fontSize: "10px", color: "#818cf8", marginBottom: "6px" }}>📋 Reported by: {inc.ngo_name}</div>}
            <div style={{ display: "flex", gap: "8px", fontSize: "10px", color: "#71717a" }}>
              <span>👥 {inc.affected || 'Unknown'} affected</span>
              <span style={{ 
                padding: "1px 6px", borderRadius: "4px", 
                background: inc.priority === 'CRITICAL' ? 'rgba(220,38,38,0.25)' : inc.priority === 'HIGH' ? 'rgba(217,119,6,0.25)' : 'rgba(34,197,94,0.25)', 
                fontWeight: 700, 
                color: inc.priority === 'CRITICAL' ? '#f87171' : inc.priority === 'HIGH' ? '#fbbf24' : '#4ade80', 
                letterSpacing: "0.05em" 
              }}>
                {inc.priority}
              </span>
            </div>
            {inc.description && <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>{inc.description}</div>}
            {deployedVols.length > 0 && (
              <div style={{ marginTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                <div style={{ fontSize: "10px", color: "#818cf8", marginBottom: "4px" }}>🛡️ Deployed Volunteers ({deployedVols.length}):</div>
                {deployedVols.map((v: any, idx: number) => (
                  <div key={idx} style={{ fontSize: "10px", color: "#a1a1aa", display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                    {v.avatar_url ? (
                      <img src={v.avatar_url} style={{ width: "14px", height: "14px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)" }} />
                    ) : (
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "rgba(255,255,255,0.15)" }}></div>
                    )}
                    {v.name || 'Volunteer'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// Map component
function MapInner({ incidents, filter, selectedIncident, setSelectedIncident }: {
  incidents: any[];
  filter: string;
  selectedIncident: string | null;
  setSelectedIncident: (id: string | null) => void;
}) {
  const [geocodeDone, setGeocodeDone] = useState(0);
  const geocodingLibrary = useMapsLibrary('geocoding');

  console.log(`[MAP_RENDER] Incidents count: ${incidents.length}, geocodingLibrary loaded: ${!!geocodingLibrary}`);

  // Geocode all incidents whenever they change
  useEffect(() => {
    if (!incidents.length || !geocodingLibrary) return;
    let cancelled = false;
    const geocoder = new geocodingLibrary.Geocoder();

    async function doGeocode() {
      for (const inc of incidents) {
        if (!inc.lat && !inc.lng) {
          const key = (inc.location || "").toLowerCase().trim();
          if (!geocodeCache[key]) {
            try {
              console.log(`[GEOCODER] Starting geocode for: ${inc.location}`);
              const response = await geocoder.geocode({ address: inc.location + ", India" });
              console.log(`[GEOCODER] Success for ${inc.location}:`, response);
              if (response.results && response.results.length > 0) {
                const loc = response.results[0].geometry.location;
                geocodeCache[key] = [loc.lat(), loc.lng()];
              } else {
                console.warn(`[GEOCODER] ZERO_RESULTS for ${inc.location}`);
              }
            } catch (err: any) {
              console.error(`[GEOCODER] FAILED for ${inc.location}. Error:`, err);
              if (err?.code === 'REQUEST_DENIED' || err?.message?.includes('Billing')) {
                console.error("[GEOCODER] CRITICAL: Google Maps API requires a Billing Account with a credit card to use the Geocoding API! See: https://console.cloud.google.com/project/_/billing/enable");
              }
              // Store fallback so we don't keep trying
              geocodeCache[key] = getFallbackCoords(inc.id ? inc.id.charCodeAt(0) : 0);
            }
          }
          
          if (!cancelled) {
            setGeocodeDone(d => d + 1);
          }
          // Smaller throttle since Google Maps API is much faster/more robust than Nominatim
          await new Promise(r => setTimeout(r, 200)); 
        }
      }
    }
    doGeocode();
    return () => { cancelled = true; };
  }, [incidents, geocodingLibrary]);

  const filtered = filter === "all" ? incidents : incidents.filter(i => i.priority === filter);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <div className="absolute inset-0" style={{ background: "#09090b" }}>
        <Map
          defaultCenter={{ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }}
          defaultZoom={DEFAULT_ZOOM}
          styles={MAP_STYLES}
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling="greedy"
        >
          {filtered.map((inc, i) => {
            const [lat, lng] = getCoords(inc.location, inc.lat, inc.lng, i);
            const intensity = inc.priority === "CRITICAL" ? 1.0 : inc.priority === "HIGH" ? 0.7 : 0.4;
            const heatColor = intensity >= 0.9 ? "#dc2626" : intensity >= 0.6 ? "#d97706" : "#22c55e";

            return (
              <div key={`wrapper-${inc.id}`}>
                <IncidentMarker
                  inc={inc}
                  i={i}
                  selectedIncident={selectedIncident}
                  setSelectedIncident={setSelectedIncident}
                />
                <MapCircle
                  center={{ lat, lng }}
                  radius={15000 * intensity}
                  fillColor={heatColor}
                  fillOpacity={0.06 * intensity}
                />
              </div>
            );
          })}
        </Map>
      </div>
    </APIProvider>
  );
}

export default function LiveMapPage() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    fetchIncidents();
    const unsubIncidents = onSnapshot(collection(db, "incidents"), () => {
      fetchIncidents();
    });
    const unsubMissions = onSnapshot(collection(db, "missions"), () => {
      fetchIncidents();
    });
    return () => {
      unsubIncidents();
      unsubMissions();
    };
  }, []);

  const fetchIncidents = async () => {
    try {
      const incidentsSnap = await getDocs(
        query(collection(db, "incidents"), orderBy("created_at", "desc"))
      );
      const data = incidentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const creatorIds = [...new Set(data.filter(d => d.created_by).map(d => d.created_by))];
      let ngoMap: Record<string, string> = {};
      const profileCache: { [key: string]: any } = {};

      for (const creatorId of creatorIds) {
        if (!profileCache[creatorId]) {
          const pSnap = await getDoc(doc(db, "profiles", creatorId));
          if (pSnap.exists()) {
            profileCache[creatorId] = pSnap.data();
          }
        }
        ngoMap[creatorId] = profileCache[creatorId]?.metadata?.orgName || profileCache[creatorId]?.name || 'Unknown NGO';
      }

      const mapped: any[] = [];
      for (const inc of data) {
        const mSnap = await getDocs(
          query(collection(db, "missions"), where("incident_id", "==", inc.id))
        );
        const missionsList: any[] = [];

        for (const mDoc of mSnap.docs) {
          const mData = { id: mDoc.id, ...mDoc.data() } as any;
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

        mapped.push({
          ...inc,
          ngo_name: inc.created_by ? (ngoMap[inc.created_by] || null) : null,
          deployed_volunteers: missionsList
            .filter((m: any) => m.status !== 'Completed')
            .map((m: any) => ({
              id: m.volunteer_id,
              name: m.profiles?.metadata?.full_name || m.profiles?.name || m.profiles?.metadata?.orgName || 'Volunteer',
              avatar_url: m.profiles?.avatar_url || null,
            }))
        });
      }
      
      setIncidents(mapped);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  const filtered = filter === "all" ? incidents : incidents.filter(i => i.priority === filter);

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

  return (
    <DashboardLayout role="admin">
      {/* Use fixed positioning to escape DashboardLayout's overflow-hidden and padding */}
      <div className="fixed inset-0 top-14 w-full z-0">
        {/* Map Area */}
        <div className="absolute inset-0 bg-background overflow-hidden font-helvetica">
          <MapInner
            incidents={incidents}
            filter={filter}
            selectedIncident={selectedIncident}
            setSelectedIncident={setSelectedIncident}
          />

          {/* Stats Overlay */}
          <div className="absolute top-4 left-4 flex gap-2 z-[1000]">
            {[
              { l: "Processing", v: incidents.filter(i => i.status === "Processing" || i.status === "Active").length },
              { l: "Dispatched", v: incidents.filter(i => i.status === "In Transit").length },
              { l: "Resolved", v: incidents.filter(i => i.status === "Resolved").length }
            ].map(s => (
              <div key={s.l} className="bg-background/80 backdrop-blur-md border border-foreground/10 rounded-lg px-3 py-2 text-center">
                <div className="text-sm font-bold">{s.v}</div>
                <div className="text-[9px] text-accent-dim">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Toggle sidebar button (mobile) */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 right-4 z-[1000] sm:hidden bg-background/80 backdrop-blur-md border border-foreground/10 rounded-lg px-3 py-2 text-xs font-bold"
          >
            {showSidebar ? "Hide" : "Feed"}
          </button>

          {/* Heatmap Legend — positioned above bottom nav */}
          <div className="absolute top-2 right-82 z-[1000] flex gap-3">
            <div className="bg-background/80 backdrop-blur-md border border-foreground/10 rounded-lg p-3 text-xs space-y-1.5">
              <div className="text-accent-dim font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Flame size={10} /> Heatmap Legend
              </div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" /> Critical</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Normal</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`absolute top-0 right-0 ${showSidebar ? 'w-80' : 'w-0'} h-full flex flex-col bg-background/95 backdrop-blur-xl border-l border-foreground/[0.06] transition-all duration-300 z-[100]`}>
          <div className="p-4 border-b border-foreground/[0.06] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold tracking-tight text-sm">Incident Feed</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-foreground/[0.04] border border-foreground/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold tracking-wider">LIVE</span>
              </div>
            </div>
            <div className="flex gap-1">
              {["all", "CRITICAL", "HIGH", "NORMAL"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-all ${filter === f ? "bg-foreground text-background" : "text-accent-dim hover:text-foreground bg-foreground/[0.03]"}`}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.04] custom-scrollbar overscroll-y-contain"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <div className="p-5 text-center text-xs text-accent-dim">
                <MapPin size={24} className="mx-auto mb-2 opacity-20" />
                No incidents to display.
              </div>
            ) : (
              filtered.map(inc => (
                <div key={inc.id} onClick={() => setSelectedIncident(inc.id)}
                  className={`w-full text-left p-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors ${selectedIncident === inc.id ? "bg-foreground/[0.04]" : ""}`}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{inc.location}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      inc.priority === "CRITICAL" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                      inc.priority === "HIGH" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    }`}>{inc.priority}</span>
                  </div>
                  <div className="text-xs text-accent-dim mb-1">{inc.type}</div>
                  {inc.ngo_name && <div className="text-[10px] text-indigo-400 mb-1">📋 {inc.ngo_name}</div>}
                  
                  {/* Deployed volunteers */}
                  {inc.deployed_volunteers && inc.deployed_volunteers.length > 0 && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="flex -space-x-1.5">
                        {inc.deployed_volunteers.slice(0, 3).map((v: any, vi: number) => (
                          v.avatar_url ? (
                            <img key={vi} src={v.avatar_url} alt="" className="w-4 h-4 rounded-full border border-background" />
                          ) : (
                            <div key={vi} className="w-4 h-4 rounded-full bg-indigo-500/30 border border-background" />
                          )
                        ))}
                      </div>
                      <span className="text-[9px] text-indigo-400 font-medium">
                        {inc.deployed_volunteers.length} deployed
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-accent-dim">
                    {inc.status === "Processing" && <><div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />Processing</>}
                    {inc.status === "Active" && <><div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />Active</>}
                    {inc.status === "In Transit" && <><Clock size={10} />Dispatched</>}
                    {inc.status === "Resolved" && <><CheckCircle2 size={10} />Resolved</>}
                    <span className="ml-auto">{inc.affected} affected</span>
                  </div>
                  <div className="text-[9px] text-accent-dim mt-1">{getTimeAgo(inc.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Google Maps InfoWindow Customization */
        .gm-style-iw-c {
          background: rgba(9, 9, 11, 0.92) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
          padding: 0 !important;
        }
        .gm-style-iw-tc::after {
          background: rgba(9, 9, 11, 0.92) !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
        }
        button.gm-ui-hover-effect {
          display: none !important;
        }
        /* Custom Scrollbar for the feed */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </DashboardLayout>
  );
}
