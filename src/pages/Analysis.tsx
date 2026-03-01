import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Checking permit requirements...",
  "Evaluating your location...",
  "Scanning competition data...",
  "Generating your report...",
];

export default function Analysis() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setCompleted(prev => [...prev, i]);
      }, (i + 1) * 1200);
    });
    setTimeout(() => navigate("/report"), STEPS.length * 1200 + 800);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10"
        >
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </motion.div>
        <h2 className="mb-8 text-2xl font-bold">Analyzing Your Business</h2>
        <div className="space-y-4 text-left">
          {STEPS.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.3, duration: 0.4 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4"
            >
              {completed.includes(i) ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                  <Check className="h-4 w-4 text-success-foreground" />
                </div>
              ) : (
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              )}
              <span className={completed.includes(i) ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
