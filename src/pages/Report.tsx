import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { getPermits, getTotalCost, getMaxTimeline } from "@/lib/permits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ExternalLink, Download, MapPin, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function ViabilityCircle({ score }: { score: number }) {
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "hsl(var(--success))" : score >= 40 ? "hsl(var(--warning))" : "hsl(var(--danger))";
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
  if (score >= 70) return <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-medium text-success">Low Risk</span>;
  if (score >= 40) return <span className="rounded-full bg-warning/20 px-3 py-1 text-sm font-medium text-warning">Medium Risk</span>;
  return <span className="rounded-full bg-danger/20 px-3 py-1 text-sm font-medium text-danger">High Risk</span>;
}

/* ───── Location Analysis Tab ───── */
function LocationTab({ data }: { data: any }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [vacants, setVacants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const lat = 41.8827;
  const lng = -87.6233;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch competitors from Chicago Open Data
        const typeMap: Record<string, string> = {
          Restaurant: "RETAIL FOOD",
          Retail: "RETAIL",
          Salon: "BEAUTY SALON",
          Office: "OFFICE",
        };
        const licenseType = typeMap[data.type] || "RETAIL";
        const competitorUrl = `https://data.cityofchicago.org/resource/xqx5-8hwx.json?$where=within_circle(location,${lat},${lng},500)&$limit=50&license_description=${encodeURIComponent(licenseType)}`;
        const vacantUrl = `https://data.cityofchicago.org/resource/7nii-7srd.json?$where=within_circle(location,${lat},${lng},500)&$limit=50`;

        const [compRes, vacRes] = await Promise.all([
          fetch(competitorUrl).then(r => r.ok ? r.json() : []),
          fetch(vacantUrl).then(r => r.ok ? r.json() : []),
        ]);
        setCompetitors(compRes);
        setVacants(vacRes);
      } catch (e) {
        console.error("Failed to fetch location data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [data.type]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    import("mapbox-gl").then((mapboxgl) => {
      import("mapbox-gl/dist/mapbox-gl.css");
      (mapboxgl as any).accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [lng, lat],
        zoom: 14,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add competitor markers (red)
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

      // Add vacant storefront markers (green)
      vacants.forEach((v: any) => {
        const vLat = v.latitude || v.location?.latitude;
        const vLng = v.longitude || v.location?.longitude;
        if (!vLat || !vLng) return;
        const el = document.createElement("div");
        el.style.cssText = "width:12px;height:12px;background:#22c55e;border-radius:50%;border:2px solid #fff;cursor:pointer;";
        new mapboxgl.Marker({ element: el })
          .setLngLat([parseFloat(vLng), parseFloat(vLat)])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(
            `<div style="color:#000;font-size:12px;"><strong>Vacant Storefront</strong><br/>${v.property_address || v.address || ""}</div>`
          ))
          .addTo(map);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [competitors, vacants]);

  const competitionLevel = competitors.length > 20 ? "High" : competitors.length > 8 ? "Medium" : "Low";
  const compColor = competitionLevel === "High" ? "text-danger" : competitionLevel === "Medium" ? "text-warning" : "text-success";

  return (
    <div className="space-y-4">
      <div ref={mapContainer} className="h-[400px] w-full rounded-xl border border-border overflow-hidden" />
      {loading ? (
        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading location data…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Competitors Nearby</p>
            <p className="text-3xl font-bold text-danger">{competitors.length}</p>
            <p className="text-xs text-muted-foreground">within 500m</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Vacant Storefronts</p>
            <p className="text-3xl font-bold text-success">{vacants.length}</p>
            <p className="text-xs text-muted-foreground">within 500m</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Competition Level</p>
            <p className={`text-3xl font-bold ${compColor}`}>{competitionLevel}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-danger" /> Competitors</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-success" /> Vacant Storefronts</span>
      </div>
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
            name: data.name,
            type: data.type,
            sellsFood: data.sellsFood,
            sellsAlcohol: data.sellsAlcohol,
            budget: data.budget,
            employees: data.employees,
            hasLocation: data.hasLocation,
            address: data.address,
            area: data.area,
            targetCustomers: data.targetCustomers,
            avgTicket: data.avgTicket,
            dailyCustomers: data.dailyCustomers,
            operatingHours: data.operatingHours,
            sqft: data.sqft,
            rentBudget: data.rentBudget,
            launchDate: data.launchDate,
          },
        },
      });
      if (fnError) throw fnError;
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSummary(result.summary);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to generate summary";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line">
          {summary}
        </div>
      ) : null}
    </div>
  );
}

/* ───── Main Report ───── */
export default function Report() {
  const { data } = useBusiness();
  const permits = getPermits(data.type, data.sellsAlcohol);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const budgetScore = data.budget > 50000 ? 30 : data.budget > 20000 ? 20 : 10;
  const employeeScore = data.employees >= 3 ? 20 : 10;
  const marketScore = data.targetCustomers.length >= 2 ? 25 : 15;
  const viability = Math.min(100, budgetScore + employeeScore + marketScore + 15);

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
                      <span className="text-sm font-medium text-primary">{p.cost === 0 ? "Free" : `$${p.cost}`}</span>
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
                  <p className="text-2xl font-bold text-primary">${getTotalCost(permits).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Max Timeline</p>
                  <p className="text-2xl font-bold">{getMaxTimeline(permits)}</p>
                </div>
              </div>
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
              <Download className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Download Report</h3>
              <p className="mb-6 max-w-md text-muted-foreground">Get a PDF summary of your complete business analysis.</p>
              <Button variant="accent" disabled>Coming Soon</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
