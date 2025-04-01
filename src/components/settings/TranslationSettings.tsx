
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import i18next from "@/i18n/config";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Spinner from "../ui/spinner";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
];

export const TranslationSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // First, fetch the authenticated user
  const { data: authData, isLoading: isAuthLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error:', error);
        navigate("/login");
        return null;
      }
      return user;
    },
  });

  // Then fetch settings only if we have a valid user
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["contractorSettings", authData?.id],
    enabled: !!authData?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("contractor_settings")
          .select("preferred_language")
          .eq("id", authData?.id)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
    },
  });

  const updateLanguage = useMutation({
    mutationFn: async (language: string) => {
      if (!authData?.id) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update({ preferred_language: language })
        .eq("id", authData.id);

      if (error) throw error;
      
      // Update i18n language
      i18next.changeLanguage(language);
      
      // Store in localStorage for persistence
      localStorage.setItem('preferred_language', language);

      // Invalidate and refetch all queries to get fresh translations
      await queryClient.invalidateQueries();

      // Force reload the page to ensure all components are re-rendered with new translations
      window.location.reload();
    },
    onSuccess: () => {
      toast({
        title: t("Language updated"),
        description: t("Your language preference has been saved."),
      });
    },
    onError: (error: any) => {
      console.error('Language update error:', error);
      toast({
        title: t("Error"),
        description: t("Failed to update language preference."),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const setupLanguage = async () => {
      try {
        if (!authData?.id) {
          navigate("/login");
          return;
        }

        const storedPreference = localStorage.getItem('preferred_language');
        const systemLanguage = navigator.language.split('-')[0];
        
        let preferredLanguage = 'en';

        if (settings?.preferred_language) {
          preferredLanguage = settings.preferred_language;
        } else if (storedPreference) {
          preferredLanguage = storedPreference;
        } else if (languages.some(lang => lang.code === systemLanguage)) {
          preferredLanguage = systemLanguage;
          if (!storedPreference) {
            localStorage.setItem('preferred_language', systemLanguage);
          }
        }

        i18next.changeLanguage(preferredLanguage);
      } catch (error) {
        console.error('Error setting up language:', error);
        if (error.message?.includes('JWT')) {
          navigate("/login");
        }
      }
    };

    setupLanguage();
  }, [settings, navigate, authData]);

  if (isAuthLoading || isSettingsLoading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-full">
        <Spinner />
        {/* <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t("Loading language preferences...")}</span> */}
      </Card>
    );
  }

  if (!authData) {
    return null;
  }

  return (
    <Card className="p-8 space-y-6">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{t("Language Settings")}</h2>
        <p className="text-lg text-muted-foreground">
          {t("Choose your preferred language")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("This will be the default language used throughout the application")}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-base font-semibold">
            {t("Preferred Language")}
          </label>
          <Select
            value={settings?.preferred_language || localStorage.getItem('preferred_language') || 'en'}
            onValueChange={(value) => updateLanguage.mutate(value)}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            {t("Choose your preferred language. This will be used across the entire application.")}
          </p>
        </div>
      </div>
    </Card>
  );
};
