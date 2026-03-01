import { useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { getPermits, getTotalCost, getMaxTimeline } from "@/lib/permits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ExternalLink, Download, MapPin, Sparkles } from "lucide-react";

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

export default function Report() {
  const { data } = useBusiness();
  const permits = getPermits(data.type, data.sellsAlcohol);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Simple viability calculation
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
                  <Checkbox
                    checked={!!checked[p.name]}
                    onCheckedChange={v => setChecked(prev => ({ ...prev, [p.name]: !!v }))}
                    className="mt-1"
                  />
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
              <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Location Analysis</h3>
              <p className="max-w-md text-muted-foreground">
                Map-based location analysis with competitor and vacant storefront data will be available once a Mapbox token is configured.
              </p>
            </div>
          </TabsContent>

          {/* AI Summary */}
          <TabsContent value="ai">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">AI-Powered Summary</h3>
              <p className="max-w-md text-muted-foreground">
                An AI-generated analysis of your business plan with personalized recommendations will be available once AI integration is enabled.
              </p>
            </div>
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
