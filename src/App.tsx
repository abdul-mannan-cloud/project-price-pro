import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Leads from "@/pages/Leads";
import NotFound from "@/pages/NotFound";
import Estimate from "@/pages/Estimate";
import PublicEstimate from "@/pages/PublicEstimate";
import Onboarding from "@/pages/Onboarding";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/estimate" element={<Estimate />} />
          <Route path="/estimate/:contractorId" element={<Estimate />} />
          <Route path="/e/:id" element={<PublicEstimate />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;