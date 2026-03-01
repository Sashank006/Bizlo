import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Building2, Settings, Key, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBusiness, defaultBusinessData } from "@/contexts/BusinessContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useRequireAuth();
  const { businesses, setBusinesses, setData } = useBusiness();

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setBusinesses(data.map((b: any) => ({
            id: b.id, name: b.name, type: b.type, sellsFood: b.sells_food, sellsAlcohol: b.sells_alcohol,
            budget: b.budget, employees: b.employees, launchDate: b.launch_date,
            hasLocation: b.has_location, address: b.address, area: b.area,
            sqft: b.sqft, rentBudget: b.rent_budget, targetCustomers: b.target_customers ? b.target_customers.split(",") : [],
            avgTicket: b.avg_ticket, dailyCustomers: b.daily_customers,
            openTime: b.operating_hours?.split("-")[0] || "09:00",
            closeTime: b.operating_hours?.split("-")[1] || "17:00",
            supplierProximity: false, parkingNeeded: false, outdoorSpace: false,
          })));
        }
      });
  }, [user, setBusinesses]);

  const handleNewBusiness = () => {
    setData(defaultBusinessData);
    navigate("/questionnaire");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete business");
      return;
    }
    setBusinesses(prev => prev.filter(b => b.id !== id));
    toast.success("Business deleted");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-border bg-card p-6 md:flex md:flex-col">
        <Link to="/" className="mb-8 text-2xl font-bold text-gradient-teal">Bizlo</Link>
        <Button variant="accent" className="mb-6 w-full justify-start" onClick={handleNewBusiness}>
          <Plus className="mr-2 h-4 w-4" /> Start New Business
        </Button>
        <div className="flex-1 space-y-1">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Your Businesses</p>
          {businesses.map((b, i) => (
            <button
              key={b.id || i}
              onClick={() => { setData(b); navigate("/report"); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{b.name || "Untitled"}</span>
            </button>
          ))}
          {businesses.length === 0 && (
            <p className="px-3 text-sm text-muted-foreground">No businesses yet</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 md:hidden">
            <Link to="/" className="text-xl font-bold text-gradient-teal">Bizlo</Link>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, <span className="text-foreground">{user.email?.split("@")[0]}</span></span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-secondary">
                  <span className="text-sm font-medium">{user.email?.[0].toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuItem><Key className="mr-2 h-4 w-4" /> Change Password</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-6">
          {businesses.length === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">Create your first business plan</h2>
              <p className="mb-8 text-muted-foreground">Answer a few questions and get a complete launch plan for your Chicago business.</p>
              <Button variant="accent" size="lg" onClick={handleNewBusiness}>
                <Plus className="mr-2 h-5 w-5" /> Start New Business
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-2xl space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Your Businesses</h2>
              {businesses.map((b, i) => (
                <div
                  key={b.id || i}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:glow-teal"
                >
                  <button
                    onClick={() => { setData(b); navigate("/report"); }}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{b.name || "Untitled"}</p>
                      <p className="text-sm text-muted-foreground">{b.type}</p>
                    </div>
                  </button>
                  {b.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this business and all its data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(b.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
