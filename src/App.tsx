import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BusinessProvider } from "@/contexts/BusinessContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Questionnaire from "./pages/Questionnaire";
import Analysis from "./pages/Analysis";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BusinessProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BusinessProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
