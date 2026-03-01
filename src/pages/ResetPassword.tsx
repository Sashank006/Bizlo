import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! Redirecting…");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center text-3xl font-bold text-gradient-teal">Bizlo</Link>
        <div className="rounded-xl border border-border bg-card p-8">
          <h2 className="mb-6 text-center text-2xl font-semibold">Set New Password</h2>
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Verifying your reset link… If this takes too long, try requesting a new password reset from the{" "}
              <Link to="/auth" className="text-primary hover:underline">sign in page</Link>.
            </p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
              </div>
              <Button variant="accent" className="w-full" type="submit" disabled={loading}>
                {loading ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
