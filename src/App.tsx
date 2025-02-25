
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Settings from "@/pages/Settings";
import Estimate from "@/pages/Estimate";
import PublicEstimate from "@/pages/PublicEstimate";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import TeamOnboarding from "@/pages/TeamOnboarding";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const setColorVariables = (colors: { primary: string; secondary: string }) => {
  const { primary, secondary } = colors;
  const primaryHex = primary.replace('#', '');
  const [r, g, b] = [
    parseInt(primaryHex.slice(0, 2), 16),
    parseInt(primaryHex.slice(2, 4), 16),
    parseInt(primaryHex.slice(4, 6), 16)
  ];

  const colorVars = {
    '--primary': primary,
    '--primary-foreground': '#FFFFFF',
    '--secondary': secondary,
    '--secondary-foreground': '#1d1d1f',
    '--primary-100': `rgba(${r}, ${g}, ${b}, 0.1)`,
    '--primary-200': `rgba(${r}, ${g}, ${b}, 0.2)`,
    '--primary-300': `rgba(${r}, ${g}, ${b}, 0.4)`,
    '--primary-400': `rgba(${r}, ${g}, ${b}, 0.6)`,
    '--primary-500': `rgba(${r}, ${g}, ${b}, 0.8)`,
    '--primary-600': primary,
    '--primary-700': `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`,
  };

  Object.entries(colorVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

function GlobalBrandingLoader() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useQuery({
    queryKey: ["globalBranding", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data: contractor, error } = await supabase
        .from("contractors")
        .select("branding_colors")
        .eq("user_id", session.user.id)
        .maybeSingle();

      console.log('branding_colors:', contractor);

      if (error || !contractor) {
        console.error(error ? `Error fetching contractor: ${error.message}` : 
                            `No contractor found for user: ${session.user.id}`);
        return null;
      }


      const colors = contractor.branding_colors as { primary: string; secondary: string } | null;
      if (colors) {
        setColorVariables(colors);
      }
      return colors;
    },
  });

  return null;
}

function App() {
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session:", session ? "Found" : "Not found");
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth state change:", event, session ? "Session exists" : "No session");
          if (event === 'SIGNED_OUT') queryClient.clear();
        });

        setIsAuthInitialized(true);
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsAuthInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!isAuthInitialized) return <div>Loading...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalBrandingLoader />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/estimate/:contractorId?" element={<Estimate />} />
          <Route path="/e/:id" element={<PublicEstimate />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/team-onboarding" element={<TeamOnboarding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
