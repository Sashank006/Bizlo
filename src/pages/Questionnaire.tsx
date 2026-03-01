import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, ArrowRight, Check, LogOut, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { useBusiness, BusinessData } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const STEPS = ["Business Basics", "Location", "Target Market", "Operations", "Review & Confirm"];
const BUSINESS_TYPES = ["Restaurant", "Retail", "Salon", "Office", "Coffee Shop", "Gym", "Daycare", "Medical", "Hotel", "Bar", "Other"];
const AREAS = ["Loop", "West Loop", "River North", "South Loop"];
const CUSTOMER_TYPES = ["Students", "Office Workers", "Tourists", "Residents"];

const MAX_TEXT = 200;
const sanitize = (v: string) => v.trim().slice(0, MAX_TEXT);

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

type Errors = Record<string, string>;

function validateStep(step: number, data: BusinessData): Errors {
  const e: Errors = {};

  if (step === 0) {
    if (!data.name.trim()) e.name = "This field is required";
    else if (data.name.trim().length < 2) e.name = "Minimum 2 characters";
    if (!data.type) e.type = "Please select a business type";
    if (!data.budget || data.budget <= 0) e.budget = "Please enter a valid number";
    if (!data.employees || data.employees <= 0 || !Number.isInteger(data.employees)) e.employees = "Please enter a valid whole number";
    if (!data.launchDate) e.launchDate = "This field is required";
    else if (new Date(data.launchDate) <= new Date()) e.launchDate = "Date must be in the future";
  }

  if (step === 1) {
    if (!data.address.trim()) e.address = "This field is required";
    else if (data.address.trim().length < 5) e.address = "Minimum 5 characters";
    if (!data.sqft || data.sqft <= 0) e.sqft = "Please enter a valid number";
    else if (data.sqft < 100 || data.sqft > 50000) e.sqft = "Must be between 100 and 50,000";
    if (!data.rentBudget || data.rentBudget <= 0) e.rentBudget = "Please enter a valid number";
  }

  if (step === 2) {
    if (!data.avgTicket || data.avgTicket <= 0) e.avgTicket = "Please enter a valid number";
    if (!data.dailyCustomers || data.dailyCustomers <= 0 || !Number.isInteger(data.dailyCustomers)) e.dailyCustomers = "Please enter a valid whole number";
    if (data.openTime && data.closeTime && data.closeTime <= data.openTime) e.closeTime = "End time must be after start time";
  }

  return e;
}

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user } = useRequireAuth();
  const { data, setData, businesses } = useBusiness();
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);

  const update = (partial: Partial<BusinessData>) => setData(prev => ({ ...prev, ...partial }));

  const errors = useMemo(() => validateStep(step, data), [step, data]);
  const isValid = Object.keys(errors).length === 0;

  const next = () => {
    setTouched(true);
    if (!isValid) return;
    if (step < 4) { setStep(step + 1); setTouched(false); }
  };
  const prev = () => { if (step > 0) { setStep(step - 1); setTouched(false); } };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error } = await supabase.from("businesses").insert({
      user_id: user.id,
      name: sanitize(data.name), type: data.type, sells_food: data.sellsFood, sells_alcohol: data.sellsAlcohol,
      has_location: data.hasLocation, address: sanitize(data.address), area: data.area,
      budget: data.budget, employees: data.employees, launch_date: data.launchDate || null,
      rent_budget: data.rentBudget, sqft: data.sqft,
      target_customers: data.targetCustomers.join(","),
      avg_ticket: data.avgTicket, daily_customers: data.dailyCustomers,
      operating_hours: `${data.openTime}-${data.closeTime}`,
    }).select().single();

    if (error) { console.error(error); return; }
    if (inserted) setData(prev => ({ ...prev, id: inserted.id }));
    navigate("/analysis");
  };

  const toggleCustomer = (c: string) => {
    update({
      targetCustomers: data.targetCustomers.includes(c)
        ? data.targetCustomers.filter(x => x !== c)
        : [...data.targetCustomers, c],
    });
  };

  const numChange = (field: keyof BusinessData, integer?: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { update({ [field]: 0 } as any); return; }
    const n = integer ? parseInt(raw, 10) : parseFloat(raw);
    if (isNaN(n)) return; // ignore non-numeric
    update({ [field]: n } as any);
  };

  const textChange = (field: keyof BusinessData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ [field]: e.target.value.slice(0, MAX_TEXT) } as any);
  };

  const show = touched;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header with back + profile */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">New Business Plan</h1>
              <p className="text-sm text-muted-foreground">{STEPS[step]}</p>
            </div>
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-secondary">
                  <span className="text-sm font-medium">{user.email?.[0].toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <Building2 className="mr-2 h-4 w-4" /> My Businesses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div className="h-full gradient-teal rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <Label>Business Name *</Label>
                    <Input className="mt-1" value={data.name} onChange={textChange("name")} placeholder="My Chicago Café" maxLength={MAX_TEXT} />
                    {show && <FieldError msg={errors.name} />}
                  </div>
                  <div>
                    <Label>Business Type *</Label>
                    <Select value={data.type} onValueChange={v => update({ type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    {show && <FieldError msg={errors.type} />}
                  </div>
                  <div className="flex items-center justify-between"><Label>Selling food?</Label><Switch checked={data.sellsFood} onCheckedChange={v => update({ sellsFood: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Selling alcohol?</Label><Switch checked={data.sellsAlcohol} onCheckedChange={v => update({ sellsAlcohol: v })} /></div>
                  <div>
                    <Label>Estimated Startup Budget ($) *</Label>
                    <Input className="mt-1" type="number" min="1" value={data.budget || ""} onChange={numChange("budget")} />
                    {show && <FieldError msg={errors.budget} />}
                  </div>
                  <div>
                    <Label>Number of Employees *</Label>
                    <Input className="mt-1" type="number" min="1" step="1" value={data.employees || ""} onChange={numChange("employees", true)} />
                    {show && <FieldError msg={errors.employees} />}
                  </div>
                  <div>
                    <Label>Target Opening Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("mt-1 w-full justify-start text-left font-normal", !data.launchDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data.launchDate ? format(new Date(data.launchDate + "T00:00:00"), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={data.launchDate ? new Date(data.launchDate + "T00:00:00") : undefined}
                          onSelect={(date) => update({ launchDate: date ? format(date, "yyyy-MM-dd") : "" })}
                          disabled={(date) => date <= new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {show && <FieldError msg={errors.launchDate} />}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <Label>Street Address in Chicago *</Label>
                    <AddressAutocomplete
                      value={data.address}
                      onChange={(addr) => update({ address: addr, hasLocation: true })}
                      className="mt-1"
                    />
                    {show && <FieldError msg={errors.address} />}
                  </div>
                  <div>
                    <Label>Square Footage Needed *</Label>
                    <Input className="mt-1" type="number" min="100" max="50000" value={data.sqft || ""} onChange={numChange("sqft")} />
                    {show && <FieldError msg={errors.sqft} />}
                  </div>
                  <div>
                    <Label>Monthly Rent Budget ($) *</Label>
                    <Input className="mt-1" type="number" min="1" value={data.rentBudget || ""} onChange={numChange("rentBudget")} />
                    {show && <FieldError msg={errors.rentBudget} />}
                  </div>
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
                  <div>
                    <Label>Average Ticket Size ($) *</Label>
                    <Input className="mt-1" type="number" min="1" value={data.avgTicket || ""} onChange={numChange("avgTicket")} />
                    {show && <FieldError msg={errors.avgTicket} />}
                  </div>
                  <div>
                    <Label>Expected Daily Customers *</Label>
                    <Input className="mt-1" type="number" min="1" step="1" value={data.dailyCustomers || ""} onChange={numChange("dailyCustomers", true)} />
                    {show && <FieldError msg={errors.dailyCustomers} />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Open Time</Label><Input className="mt-1" type="time" value={data.openTime} onChange={e => update({ openTime: e.target.value })} /></div>
                    <div>
                      <Label>Close Time</Label>
                      <Input className="mt-1" type="time" value={data.closeTime} onChange={e => update({ closeTime: e.target.value })} />
                      {show && <FieldError msg={errors.closeTime} />}
                    </div>
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

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prev} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            {step < 4 ? (
              <Button variant="accent" onClick={next} disabled={touched && !isValid}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button variant="accent" onClick={handleSubmit}><Check className="mr-2 h-4 w-4" /> Run Analysis</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
