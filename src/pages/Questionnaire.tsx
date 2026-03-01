import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useBusiness, BusinessData } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = ["Business Basics", "Location", "Target Market", "Operations", "Review & Confirm"];
const BUSINESS_TYPES = ["Restaurant", "Retail", "Salon", "Office", "Other"];
const AREAS = ["Loop", "West Loop", "River North", "South Loop"];
const CUSTOMER_TYPES = ["Students", "Office Workers", "Tourists", "Residents"];

export default function Questionnaire() {
  const navigate = useNavigate();
  const { data, setData } = useBusiness();
  const [step, setStep] = useState(0);

  const update = (partial: Partial<BusinessData>) => setData(prev => ({ ...prev, ...partial }));

  const next = () => { if (step < 4) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error } = await supabase.from("businesses").insert({
      user_id: user.id,
      name: data.name, type: data.type, sells_food: data.sellsFood, sells_alcohol: data.sellsAlcohol,
      has_location: data.hasLocation, address: data.address, area: data.area,
      budget: data.budget, employees: data.employees, launch_date: data.launchDate || null,
      rent_budget: data.rentBudget, sqft: data.sqft,
      target_customers: data.targetCustomers.join(","),
      avg_ticket: data.avgTicket, daily_customers: data.dailyCustomers,
      operating_hours: `${data.openTime}-${data.closeTime}`,
    }).select().single();

    if (error) { console.error(error); return; }
    if (inserted) {
      setData(prev => ({ ...prev, id: inserted.id }));
    }
    navigate("/analysis");
  };

  const toggleCustomer = (c: string) => {
    update({
      targetCustomers: data.targetCustomers.includes(c)
        ? data.targetCustomers.filter(x => x !== c)
        : [...data.targetCustomers, c],
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold">New Business Plan</h1>
        <p className="mb-6 text-sm text-muted-foreground">{STEPS[step]}</p>

        {/* Progress bar */}
        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div className="h-full gradient-teal rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>

        {/* Steps */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div><Label>Business Name</Label><Input className="mt-1" value={data.name} onChange={e => update({ name: e.target.value })} placeholder="My Chicago Café" /></div>
                  <div><Label>Business Type</Label>
                    <Select value={data.type} onValueChange={v => update({ type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between"><Label>Selling food?</Label><Switch checked={data.sellsFood} onCheckedChange={v => update({ sellsFood: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Selling alcohol?</Label><Switch checked={data.sellsAlcohol} onCheckedChange={v => update({ sellsAlcohol: v })} /></div>
                  <div><Label>Estimated Startup Budget ($)</Label><Input className="mt-1" type="number" value={data.budget || ""} onChange={e => update({ budget: Number(e.target.value) })} /></div>
                  <div><Label>Number of Employees</Label><Input className="mt-1" type="number" value={data.employees || ""} onChange={e => update({ employees: Number(e.target.value) })} /></div>
                  <div><Label>Target Opening Date</Label><Input className="mt-1" type="date" value={data.launchDate} onChange={e => update({ launchDate: e.target.value })} /></div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between"><Label>Do you have an address in mind?</Label><Switch checked={data.hasLocation} onCheckedChange={v => update({ hasLocation: v })} /></div>
                  {data.hasLocation ? (
                    <div><Label>Address</Label><Input className="mt-1" value={data.address} onChange={e => update({ address: e.target.value })} placeholder="123 W Madison St" /></div>
                  ) : (
                    <div><Label>Preferred Area</Label>
                      <Select value={data.area} onValueChange={v => update({ area: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Square Footage Needed</Label><Input className="mt-1" type="number" value={data.sqft || ""} onChange={e => update({ sqft: Number(e.target.value) })} /></div>
                  <div><Label>Monthly Rent Budget ($)</Label><Input className="mt-1" type="number" value={data.rentBudget || ""} onChange={e => update({ rentBudget: Number(e.target.value) })} /></div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <Label>Target Customers</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {CUSTOMER_TYPES.map(c => (
                        <label key={c} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors">
                          <Checkbox checked={data.targetCustomers.includes(c)} onCheckedChange={() => toggleCustomer(c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><Label>Average Ticket Size ($)</Label><Input className="mt-1" type="number" value={data.avgTicket || ""} onChange={e => update({ avgTicket: Number(e.target.value) })} /></div>
                  <div><Label>Expected Daily Customers</Label><Input className="mt-1" type="number" value={data.dailyCustomers || ""} onChange={e => update({ dailyCustomers: Number(e.target.value) })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Open Time</Label><Input className="mt-1" type="time" value={data.openTime} onChange={e => update({ openTime: e.target.value })} /></div>
                    <div><Label>Close Time</Label><Input className="mt-1" type="time" value={data.closeTime} onChange={e => update({ closeTime: e.target.value })} /></div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between"><Label>Supplier proximity required?</Label><Switch checked={data.supplierProximity} onCheckedChange={v => update({ supplierProximity: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Parking needed?</Label><Switch checked={data.parkingNeeded} onCheckedChange={v => update({ parkingNeeded: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Outdoor space needed?</Label><Switch checked={data.outdoorSpace} onCheckedChange={v => update({ outdoorSpace: v })} /></div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Review Your Answers</h3>
                  {[
                    ["Business Name", data.name],
                    ["Type", data.type],
                    ["Sells Food", data.sellsFood ? "Yes" : "No"],
                    ["Sells Alcohol", data.sellsAlcohol ? "Yes" : "No"],
                    ["Budget", `$${data.budget.toLocaleString()}`],
                    ["Employees", data.employees],
                    ["Opening Date", data.launchDate || "Not set"],
                    ["Location", data.hasLocation ? data.address : data.area],
                    ["Sq Ft", data.sqft],
                    ["Rent Budget", `$${data.rentBudget.toLocaleString()}/mo`],
                    ["Target Customers", data.targetCustomers.join(", ") || "None"],
                    ["Avg Ticket", `$${data.avgTicket}`],
                    ["Daily Customers", data.dailyCustomers],
                    ["Hours", `${data.openTime} - ${data.closeTime}`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prev} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            {step < 4 ? (
              <Button variant="accent" onClick={next}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button variant="accent" onClick={handleSubmit}><Check className="mr-2 h-4 w-4" /> Run Analysis</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
