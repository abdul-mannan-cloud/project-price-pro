import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import i18next from "@/i18n/config";
import { useNavigate } from "react-router-dom";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
];

export const TranslationSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["contractorSettings"],
    queryFn: async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          navigate("/login");
          return null;
        }

        const { data, error } = await supabase
          .from("contractor_settings")
          .select("preferred_language")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching settings:', error);
        if (error.message?.includes('JWT')) {
          navigate("/login");
        }
        return null;
      }
    },
  });

  const updateLanguage = useMutation({
    mutationFn: async (language: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update({ preferred_language: language })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update i18n language
      i18next.changeLanguage(language);
      
      // Store in localStorage for persistence
      localStorage.setItem('preferred_language', language);
    },
    onSuccess: () => {
      toast({
        title: t("Language updated"),
        description: t("Your language preference has been saved."),
      });
    },
    onError: () => {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
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

        await i18next.changeLanguage(preferredLanguage);
      } catch (error) {
        console.error('Error setting up language:', error);
        if (error.message?.includes('JWT')) {
          navigate("/login");
        }
      }
    };

    setupLanguage();
  }, [settings, navigate]);

  if (isLoading) {
    return <div>{t("Loading language preferences...")}</div>;
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