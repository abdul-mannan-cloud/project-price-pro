import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Settings from "@/pages/Settings";
import Estimate from "@/pages/Estimate";
import PublicEstimate from "@/pages/PublicEstimate";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/estimate/:contractorId" element={<Estimate />} />
        <Route path="/e/:id" element={<PublicEstimate />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;