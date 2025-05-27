// src/components/ui/header.tsx
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon } from "lucide-react";

export function Header1() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsAuthenticated(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Contractor data (unused here, but kept)
  useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  // Dark mode toggle
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      html.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [isDark]);

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        bg-white bg-opacity-80
        dark:bg-[var(--card)] dark:bg-opacity-80
        backdrop-blur-sm
        border-b border-gray-200 dark:border-[#2a2e3e]
      "
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl font-bold text-[var(--primary)]">
              Estimatrix.io
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            <button
              aria-label="Toggle dark mode"
              onClick={() => setIsDark(!isDark)}
              className="
                p-2 rounded-full
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition
              "
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-[var(--foreground)]" />
              ) : (
                <Moon className="w-5 h-5 text-[var(--foreground)]" />
              )}
            </button>

            {!isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate("/signup")}
                  variant="outline"
                  className="
                    text-gray-800 hover:text-gray-600
                    dark:text-[var(--foreground)] dark:hover:text-gray-300
                  "
                >
                  Sign Up
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="
                    text-gray-800 hover:text-gray-600
                    dark:text-[var(--foreground)] dark:hover:text-gray-300
                  "
                >
                  Sign In
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="
                  text-gray-800 hover:text-gray-600
                  dark:text-[var(--foreground)] dark:hover:text-gray-300
                "
              >
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
