import { useState, useEffect, useRef, useCallback } from "react";
import { generateReport } from "@/lib/generatePdf";
import { Link } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { getPermits, getTotalCostRange, getMaxTimeline, PERMIT_DISCLAIMER } from "@/lib/permits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ExternalLink, Download, Sparkles, Loader2, RefreshCw, AlertTriangle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/* ───── Geocode address to real coordinates ───── */
async function geocodeAddress(address: string): Promise<[number, number]> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token || !address) return [41.8827, -87.6233]; // Chicago fallback
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=us&limit=1`
    );
    if (!res.ok) return [41.8827, -87.6233];
    const data = await res.json();
    const coords = data.features?.[0]?.center;
    if (coords) return [coords[1], coords[0]]; // [lat, lng]
  } catch { /* fallback */ }
  return [41.8827, -87.6233];
}

/* ───── Reverse geocode to get street/neighborhood name ───── */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=neighborhood,locality&limit=1`
    );
    if (!res.ok) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    const data = await res.json();
    return data.features?.[0]?.text || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch { return `${lat.toFixed(3)}, ${lng.toFixed(3)}`; }
}

/* ───── Market Fit Score ───── */
function calcMarketFitScore(businessType: string, area: string, targetCustomers: string[]): number {
  let score = 50; // baseline

  const highFitCombos: Record<string, string[]> = {
    Restaurant: ["Loop", "West Loop"],
    "Coffee Shop": ["Loop", "West Loop"],
    Retail: ["River North"],
    Office: ["Loop"],
    Bar: ["River North", "West Loop"],
    Salon: ["River North", "South Loop"],
    Gym: ["South Loop", "West Loop"],
    Daycare: ["South Loop"],
    Medical: ["Loop", "South Loop"],
    Hotel: ["Loop", "River North"],
  };

  const fits = highFitCombos[businessType] || [];
  if (fits.includes(area)) {
    score = 85;
  } else {
    score = 45;
  }

  // Bonus if target customers align with area demographics
  const areaDemographics: Record<string, string[]> = {
    Loop: ["office workers", "tourists", "commuters", "professionals"],
    "West Loop": ["foodies", "young professionals", "affluent diners", "professionals"],
    "River North": ["tourists", "nightlife", "shoppers", "young professionals"],
    "South Loop": ["residents", "families", "students", "commuters"],
  };
  const demo = areaDemographics[area] || [];
  const overlap = targetCustomers.filter(tc => demo.some(d => tc.toLowerCase().includes(d) || d.includes(tc.toLowerCase())));
  if (overlap.length > 0) {
    score = Math.min(100, score + 10);
  }

  console.log(`[MarketFit] type=${businessType}, area=${area}, targetCustomers=${targetCustomers}, score=${score}`);
  return score;
}

/* ───── Viability Circle ───── */
function ViabilityCircle({ score }: { score: number }) {
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 71 ? "hsl(var(--success))" : score >= 41 ? "hsl(var(--warning))" : "hsl(var(--danger))";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <span className="absolute text-3xl font-bold">{score}</span>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 71) return <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-medium text-success">Strong Viability</span>;
  if (score >= 41) return <span className="rounded-full bg-warning/20 px-3 py-1 text-sm font-medium text-warning">Moderate Risk</span>;
  return <span className="rounded-full bg-danger/20 px-3 py-1 text-sm font-medium text-danger">High Risk</span>;
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = value >= 71 ? "bg-success" : value >= 41 ? "bg-warning" : "bg-danger";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label} ({weight})</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ───── Haversine distance (meters) ───── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ───── Crime rate: crimes per 1,000 population ───── */
// 250m radius circle ≈ 0.196 km². Chicago avg density ~4,600/km² → ~900 people.
// We estimate population for the area and compute rate per 1,000.
const EST_POP_250M = 900;
function crimeRate(crimeCount: number): number {
  return Math.round((crimeCount / EST_POP_250M) * 1000 * 10) / 10; // one decimal
}
function crimeRiskLabel(count: number): string {
  const rate = crimeRate(count);
  if (rate < 17) return "🟢 Low Risk";
  if (rate <= 33) return "🟡 Medium Risk";
  return "🔴 High Risk";
}
function crimeRiskScore(count: number): number {
  const rate = crimeRate(count);
  if (rate < 17) return 90;
  if (rate <= 33) return 50;
  return 20;
}

/* ───── Fetch area data helper ───── */
async function fetchAreaData(lat: number, lng: number, businessType: string, areaLabel: string) {
  const typeMap: Record<string, string> = {
    Restaurant: "RETAIL FOOD", Retail: "RETAIL", Salon: "BEAUTY SALON",
    "Coffee Shop": "RETAIL FOOD", Bar: "LIQUOR", Gym: "LIMITED BUSINESS LICENSE",
  };
  const licenseType = typeMap[businessType] || "RETAIL";
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const dateStr = sixMonthsAgo.split("T")[0];

  const [compRes, crimeRes, ctaRes] = await Promise.all([
    fetch(`https://data.cityofchicago.org/resource/xqx5-8hwx.json?$where=within_circle(location,${lat},${lng},500)&$limit=50&license_description=${encodeURIComponent(licenseType)}`).then(r => r.ok ? r.json() : []),
    fetch(`https://data.cityofchicago.org/resource/ijzp-q8t2.json?$where=within_circle(location,${lat},${lng},250) AND date>'${dateStr}'&$limit=50&$order=date DESC`).then(r => r.ok ? r.json() : []),
    fetch(`https://data.cityofchicago.org/resource/8mj8-j3c4.json`).then(r => r.ok ? r.json() : []),
  ]);

  const stationMap = new Map<string, { name: string; walkMin: number }>();
  ctaRes.forEach((s: any) => {
    const coords = s.location?.coordinates;
    if (!coords || coords.length < 2) return;
    const sLat = coords[1];
    const sLng = coords[0];
    const name = s.station_name || "Unknown";
    if (stationMap.has(name)) return;
    const dist = haversine(lat, lng, sLat, sLng);
    stationMap.set(name, { name, walkMin: Math.round(dist / 80) });
  });
  const ctaStations = Array.from(stationMap.values()).sort((a, b) => a.walkMin - b.walkMin).slice(0, 3);

  return { competitors: compRes, crimes: crimeRes, ctaStations };
}

/* ───── Location Suggestion type ───── */
interface AreaSuggestion {
  area: string;
  compCount: number;
  crimeCount: number;
  ctaMin: number;
  ctaName: string;
  reason: string;
  score: number;
  distKm: number;
  lat: number;
  lng: number;
}

/* ───── Location Analysis Tab ───── */
function LocationTab({ data }: { data: any }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [vacants, setVacants] = useState<any[]>([]);
  const [crimes, setCrimes] = useState<any[]>([]);
  const [ctaStations, setCtaStations] = useState<{ name: string; walkMin: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [allComparable, setAllComparable] = useState(false);

  // Geocode user's actual address
  useEffect(() => {
    const addr = data.hasLocation ? data.address : data.area;
    geocodeAddress(addr || "Chicago, IL").then(c => setCoords(c));
  }, [data.address, data.area, data.hasLocation]);

  const lat = coords?.[0] ?? 41.8827;
  const lng = coords?.[1] ?? -87.6233;

  useEffect(() => {
    if (!coords) return;
    const fetchData = async () => {
      try {
        const typeMap: Record<string, string> = {
          Restaurant: "RETAIL FOOD", Retail: "RETAIL", Salon: "BEAUTY SALON",
          "Coffee Shop": "RETAIL FOOD", Bar: "LIQUOR", Gym: "LIMITED BUSINESS LICENSE",
        };
        const licenseType = typeMap[data.type] || "RETAIL";
        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
        const dateStr = sixMonthsAgo.split("T")[0];

        const [compRes, vacRes, crimeRes, ctaRes] = await Promise.all([
          fetch(`https://data.cityofchicago.org/resource/xqx5-8hwx.json?$where=within_circle(location,${lat},${lng},500)&$limit=50&license_description=${encodeURIComponent(licenseType)}`).then(r => r.ok ? r.json() : []),
          fetch(`https://data.cityofchicago.org/resource/7nii-7srd.json?$where=within_circle(location,${lat},${lng},500)&$limit=50`).then(r => r.ok ? r.json() : []),
          fetch(`https://data.cityofchicago.org/resource/ijzp-q8t2.json?$where=within_circle(location,${lat},${lng},250) AND date>'${dateStr}'&$limit=50&$order=date DESC`).then(r => r.ok ? r.json() : []),
          fetch(`https://data.cityofchicago.org/resource/8mj8-j3c4.json`).then(r => r.ok ? r.json() : []),
        ]);

        setCompetitors(compRes);
        setVacants(vacRes);
        setCrimes(crimeRes);

        const stationMap = new Map<string, { name: string; walkMin: number }>();
        ctaRes.forEach((s: any) => {
          const coords_ = s.location?.coordinates;
          if (!coords_ || coords_.length < 2) return;
          const name = s.station_name || "Unknown";
          if (stationMap.has(name)) return;
          const dist = haversine(lat, lng, coords_[1], coords_[0]);
          stationMap.set(name, { name, walkMin: Math.round(dist / 80) });
        });
        const nearest = Array.from(stationMap.values()).sort((a, b) => a.walkMin - b.walkMin).slice(0, 3);
        setCtaStations(nearest);

        // Main location scores for comparison
        const mainCompScore = compRes.length <= 3 ? 90 : compRes.length <= 8 ? 60 : 25;
        const mainSafeScore = crimeRiskScore(crimeRes.length);
        const mainCtaScore = nearest.length > 0 ? (nearest[0].walkMin <= 5 ? 90 : nearest[0].walkMin <= 10 ? 70 : 40) : 40;
        const mainOverall = Math.round((mainCompScore + mainSafeScore + mainCtaScore) / 3);

        // Coordinate-based directional suggestions
        const directions: { label: string; dLat: number; dLng: number }[] = [
          { label: "North", dLat: 0.018, dLng: 0 },
          { label: "South", dLat: -0.018, dLng: 0 },
          { label: "East", dLat: 0, dLng: 0.025 },
          { label: "West", dLat: 0, dLng: -0.025 },
        ];

        const suggestionResults = await Promise.all(directions.map(async (dir) => {
          const sLat = lat + dir.dLat;
          const sLng = lng + dir.dLng;
          const distM = haversine(lat, lng, sLat, sLng);
          const distKm = Math.round(distM / 100) / 10;

          const [areaData, streetName] = await Promise.all([
            fetchAreaData(sLat, sLng, data.type, dir.label),
            reverseGeocode(sLat, sLng),
          ]);

          const compScore_ = areaData.competitors.length <= 3 ? 90 : areaData.competitors.length <= 8 ? 60 : 25;
          const safeScore_ = crimeRiskScore(areaData.crimes.length);
          const ctaScore_ = areaData.ctaStations.length > 0
            ? (areaData.ctaStations[0].walkMin <= 5 ? 90 : areaData.ctaStations[0].walkMin <= 10 ? 70 : 40)
            : 40;
          const overall = Math.round((compScore_ + safeScore_ + ctaScore_) / 3);

          let reason = "";
          if (compScore_ > mainCompScore) reason += "Less competition. ";
          if (safeScore_ > mainSafeScore) reason += "Safer area. ";
          if (ctaScore_ > mainCtaScore) reason += "Better transit access. ";
          if (!reason) reason = "Comparable to your current location.";

          return {
            area: `${distKm}km ${dir.label} · ${streetName}`,
            compCount: areaData.competitors.length,
            crimeCount: areaData.crimes.length,
            ctaMin: areaData.ctaStations[0]?.walkMin || 99,
            ctaName: areaData.ctaStations[0]?.name || "—",
            reason: reason.trim(),
            score: overall,
            distKm,
            lat: sLat,
            lng: sLng,
          };
        }));

        // Only show suggestions that score better than current location
        const betterOnes = suggestionResults.filter(s => s.score > mainOverall).sort((a, b) => b.score - a.score).slice(0, 3);
        if (betterOnes.length === 0) {
          setAllComparable(true);
          setSuggestions([]);
        } else {
          setAllComparable(false);
          setSuggestions(betterOnes);
        }
      } catch (e) {
        console.error("Failed to fetch location data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [data.type, coords, lat, lng]);

  // Initialize Mapbox map with static import
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: 14,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Red = competitors
      competitors.forEach((c: any) => {
        const cLat = c.latitude || c.location?.latitude;
        const cLng = c.longitude || c.location?.longitude;
        if (!cLat || !cLng) return;
        const el = document.createElement("div");
        el.style.cssText = "width:12px;height:12px;background:#ef4444;border-radius:50%;border:2px solid #fff;cursor:pointer;";
        new mapboxgl.Marker({ element: el })
          .setLngLat([parseFloat(cLng), parseFloat(cLat)])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(
            `<div style="color:#000;font-size:12px;"><strong>${c.doing_business_as_name || c.legal_name || "Competitor"}</strong><br/>${c.address || ""}</div>`
          ))
          .addTo(map);
      });

      // Green = vacant storefronts (click opens LoopNet)
      vacants.forEach((v: any) => {
        const vLat = v.latitude || v.location?.latitude;
        const vLng = v.longitude || v.location?.longitude;
        if (!vLat || !vLng) return;
        const addr = `${v.address_street_number || ""} ${v.address_street_direction || ""} ${v.address_street_name || ""} ${v.address_street_suffix || ""}`.trim();
        const el = document.createElement("div");
        el.style.cssText = "width:12px;height:12px;background:#22c55e;border-radius:50%;border:2px solid #fff;cursor:pointer;";
        el.addEventListener("click", () => {
          window.open("https://www.loopnet.com/search/commercial-real-estate/chicago-il/for-lease/", "_blank");
        });
        new mapboxgl.Marker({ element: el })
          .setLngLat([parseFloat(vLng), parseFloat(vLat)])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(
            `<div style="color:#000;font-size:12px;"><strong>Vacant Storefront</strong><br/>${addr}<br/><a href="https://www.loopnet.com/search/commercial-real-estate/chicago-il/for-lease/" target="_blank" style="color:#2563eb;">View on LoopNet →</a></div>`
          ))
          .addTo(map);
      });

      // Blue = crime incidents
      crimes.forEach((cr: any) => {
        const cLat = cr.latitude || cr.location?.latitude;
        const cLng = cr.longitude || cr.location?.longitude;
        if (!cLat || !cLng) return;
        const el = document.createElement("div");
        el.style.cssText = "width:10px;height:10px;background:#3b82f6;border-radius:50%;border:2px solid #fff;cursor:pointer;opacity:0.7;";
        new mapboxgl.Marker({ element: el })
          .setLngLat([parseFloat(cLng), parseFloat(cLat)])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(
            `<div style="color:#000;font-size:12px;"><strong>${cr.primary_type || "Incident"}</strong><br/>${cr.description || ""}<br/>${cr.date ? new Date(cr.date).toLocaleDateString() : ""}</div>`
          ))
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [competitors, vacants, crimes, lat, lng]);

  // Score calculations from live data
  const compScore = competitors.length <= 3 ? "🟢 Low" : competitors.length <= 8 ? "🟡 Medium" : "🔴 High";

  // Safety — 250m radius, crime rate per 1,000 population
  const crimeApiFailed = crimes.length === 0 && !loading;
  const safetyLabel = crimeApiFailed
    ? "⚠️ Unavailable"
    : crimeRiskLabel(crimes.length);

  // CTA proximity score from live data
  const ctaScore = ctaStations.length > 0
    ? (ctaStations[0].walkMin <= 5 ? "🟢 Excellent" : ctaStations[0].walkMin <= 10 ? "🟡 Good" : "🔴 Far")
    : "—";

  return (
    <div className="space-y-4">
      <div ref={mapContainer} style={{ height: "400px", width: "100%" }} className="rounded-xl border border-border overflow-hidden" />
      {loading ? (
        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading location data…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">Competition Score</p>
              <p className="text-2xl font-bold">{compScore}</p>
              <p className="text-xs text-muted-foreground">{competitors.length} competitors within 500m</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">Safety Risk Level</p>
              <p className="text-2xl font-bold">{safetyLabel}</p>
              {crimeApiFailed ? (
                <p className="text-xs text-muted-foreground mt-1">⚠️ Safety data temporarily unavailable. Exercise general urban caution and verify locally.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Crime rate: {crimeRate(crimes.length)}/1,000 pop. · Based on historical data (250m, 6 mo)</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">CTA Proximity</p>
              <p className="text-2xl font-bold">{ctaScore}</p>
              {ctaStations.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground">{s.name} — {s.walkMin} min walk</p>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-danger" /> Competitors</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-success" /> Vacant Storefronts</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#3b82f6" }} /> Crime Incidents</span>
          </div>

          {/* Alternative Location Suggestions */}
          {allComparable && (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-sm text-muted-foreground">✅ Your chosen location is competitive with nearby alternatives.</p>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Better Nearby Alternatives
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {suggestions.map((s) => {
                  const compLabel = s.compCount <= 3 ? "🟢 Low" : s.compCount <= 8 ? "🟡 Medium" : "🔴 High";
                  const safeLabel = crimeRiskLabel(s.crimeCount);
                  const rate = crimeRate(s.crimeCount);
                  const scoreColor = s.score >= 71 ? "text-success" : s.score >= 41 ? "text-warning" : "text-danger";
                  // Split area into distance + name parts
                  const [distPart, ...nameParts] = s.area.split(" · ");
                  const neighborhoodName = nameParts.join(" · ") || distPart;
                  return (
                    <div key={s.area} className="rounded-xl border border-border bg-card p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{neighborhoodName}</h4>
                          <p className="text-xs text-muted-foreground">{distPart} from your location</p>
                        </div>
                        <span className={`text-xl font-bold ${scoreColor}`}>{s.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{s.reason}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Competition</span><span>{compLabel}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Safety</span><span>{safeLabel} ({rate}/1k)</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Nearest CTA</span><span>{s.ctaName} ({s.ctaMin} min)</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            ℹ️ Location scores are based on real Chicago city data. Vacancy and crime data may have a 7-day delay. All metrics should be cross-verified before making business decisions.
          </div>
        </>
      )}
    </div>
  );
}

/* ───── AI Summary Tab ───── */
function AiSummaryTab({ data }: { data: any }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("ai-summary", {
        body: {
          businessData: {
            name: data.name, type: data.type, sellsFood: data.sellsFood, sellsAlcohol: data.sellsAlcohol,
            budget: data.budget, employees: data.employees, hasLocation: data.hasLocation,
            address: data.address, area: data.area, targetCustomers: data.targetCustomers,
            avgTicket: data.avgTicket, dailyCustomers: data.dailyCustomers, operatingHours: data.operatingHours,
            sqft: data.sqft, rentBudget: data.rentBudget, launchDate: data.launchDate,
          },
        },
      });
      if (fnError) throw fnError;
      if (result?.error) { setError(result.error); toast.error(result.error); }
      else { setSummary(result.summary); }
    } catch (e: any) {
      const msg = e?.message || "Failed to generate summary";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [data]);

  useEffect(() => { generate(); }, [generate]);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Bizlo AI Analysis</h3>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">AI</span>
        </div>
        {summary && (
          <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Regenerate
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your business plan…</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="accent" onClick={generate}>Try Again</Button>
        </div>
      ) : summary ? (
        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line">{summary}</div>
      ) : null}
    </div>
  );
}

/* ───── Main Report ───── */
export default function Report() {
  const { data } = useBusiness();
  const permits = getPermits(data.type, data.sellsAlcohol);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Live viability sub-scores
  const marketFitScore = calcMarketFitScore(data.type, data.area, data.targetCustomers || []);
  const [reportCoords, setReportCoords] = useState<[number, number] | null>(null);
  const [compCount, setCompCount] = useState(0);
  const [crimeCount, setCrimeCount] = useState(0);
  const [scoresLoaded, setScoresLoaded] = useState(false);

  useEffect(() => {
    const addr = data.hasLocation ? data.address : data.area;
    geocodeAddress(addr || "Chicago, IL").then(c => setReportCoords(c));
  }, [data.address, data.area, data.hasLocation]);

  useEffect(() => {
    if (!reportCoords) return;
    const [rLat, rLng] = reportCoords;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const dateStr = sixMonthsAgo.split("T")[0];
    const typeMap: Record<string, string> = {
      Restaurant: "RETAIL FOOD", Retail: "RETAIL", Salon: "BEAUTY SALON",
      "Coffee Shop": "RETAIL FOOD", Bar: "LIQUOR", Gym: "LIMITED BUSINESS LICENSE",
    };
    const lt = typeMap[data.type] || "RETAIL";

    Promise.all([
      fetch(`https://data.cityofchicago.org/resource/xqx5-8hwx.json?$where=within_circle(location,${rLat},${rLng},500)&$limit=50&license_description=${encodeURIComponent(lt)}`).then(r => r.ok ? r.json() : []),
      fetch(`https://data.cityofchicago.org/resource/ijzp-q8t2.json?$where=within_circle(location,${rLat},${rLng},250) AND date>'${dateStr}'&$limit=50&$order=date DESC`).then(r => r.ok ? r.json() : []),
    ]).then(([comp, crime]) => {
      setCompCount(comp.length);
      setCrimeCount(crime.length);
      setScoresLoaded(true);
    });
  }, [data.type, reportCoords]);

  const competitionScore = compCount <= 3 ? 90 : compCount <= 8 ? 60 : 25;
  const costRange = getTotalCostRange(permits);
  const budgetAdequacy = data.budget >= costRange.max ? 90 : data.budget >= costRange.min ? 60 : 20;
  const safetyScore = crimeRiskScore(crimeCount);

  const viability = Math.round((marketFitScore * 0.25) + (competitionScore * 0.25) + (budgetAdequacy * 0.25) + (safetyScore * 0.25));

  console.log(`[Viability] Final scores — marketFit=${marketFitScore} competition=${competitionScore} budget=${budgetAdequacy} safety=${safetyScore} viability=${viability}`);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{data.name || "Business Report"}</h1>
            <p className="text-sm text-muted-foreground">{data.type} • {data.hasLocation ? data.address : data.area}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permits">Permits</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="ai">AI Summary</TabsTrigger>
            <TabsTrigger value="download">Download</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Business Summary</h3>
                {[
                  ["Name", data.name], ["Type", data.type],
                  ["Budget", `$${data.budget.toLocaleString()}`],
                  ["Employees", data.employees],
                  ["Target Opening", data.launchDate || "TBD"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-border py-2 last:border-0 text-sm">
                    <span className="text-muted-foreground">{k}</span><span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6">
                <p className="mb-4 text-sm text-muted-foreground">Viability Score</p>
                <ViabilityCircle score={viability} />
                <div className="mt-4"><RiskBadge score={viability} /></div>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold">Score Breakdown</h3>
              <ScoreBar label="Market Fit" value={marketFitScore} weight="25%" />
              <ScoreBar label="Competition" value={competitionScore} weight="25%" />
              <ScoreBar label="Budget Adequacy" value={budgetAdequacy} weight="25%" />
              <ScoreBar label="Safety" value={safetyScore} weight="25%" />
            </div>

            {/* Disclaimer */}
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                ⚠️ Disclaimer: Bizlo's analysis is based on publicly available Chicago city data and is for informational purposes only. This is not legal or financial advice. Always verify permit requirements, costs, and location data with Chicago city departments, a licensed attorney, and a commercial real estate professional before making any business decisions.
              </p>
            </div>
          </TabsContent>

          {/* Permits */}
          <TabsContent value="permits">
            <div className="space-y-4">
              {permits.map(p => (
                <div key={p.name} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <Checkbox checked={!!checked[p.name]} onCheckedChange={v => setChecked(prev => ({ ...prev, [p.name]: !!v }))} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{p.name}</h4>
                      <span className="text-sm font-medium text-primary">{p.cost}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.agency} • {p.timeline}</p>
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
              <div className="flex justify-between rounded-xl border border-primary/30 bg-primary/5 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    {(() => { const r = getTotalCostRange(permits); return r.min === r.max ? `$${r.min.toLocaleString()}` : `$${r.min.toLocaleString()} – $${r.max.toLocaleString()}`; })()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Max Timeline</p>
                  <p className="text-2xl font-bold">{getMaxTimeline(permits)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">{PERMIT_DISCLAIMER}</p>
            </div>
          </TabsContent>

          {/* Location */}
          <TabsContent value="location">
            <LocationTab data={data} />
          </TabsContent>

          {/* AI Summary */}
          <TabsContent value="ai">
            <AiSummaryTab data={data} />
          </TabsContent>

          {/* Download */}
          <TabsContent value="download">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
              <Download className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Download Report</h3>
              <p className="mb-6 max-w-md text-muted-foreground">Get a PDF summary of your business overview, permits, and cost estimates.</p>
              <Button variant="accent" onClick={() => generateReport(data, viability)}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
