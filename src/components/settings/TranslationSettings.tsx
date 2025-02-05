
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
];

// Add translations for all UI text
const translations = {
  en: {
    translations: {
      "Language Settings": "Language Settings",
      "Choose your preferred language": "Choose your preferred language",
      "This will be the default language used throughout the application": "This will be the default language used throughout the application",
      "Preferred Language": "Preferred Language",
      "Language updated": "Language updated",
      "Your language preference has been saved.": "Your language preference has been saved.",
      "Error": "Error",
      "Failed to update language preference.": "Failed to update language preference.",
      "Loading language preferences...": "Loading language preferences...",
      "Choose your preferred language. This will be used across the entire application.": "Choose your preferred language. This will be used across the entire application."
    }
  },
  es: {
    translations: {
      "Language Settings": "Configuración de idioma",
      "Choose your preferred language": "Elige tu idioma preferido",
      "This will be the default language used throughout the application": "Este será el idioma predeterminado utilizado en toda la aplicación",
      "Preferred Language": "Idioma preferido",
      "Language updated": "Idioma actualizado",
      "Your language preference has been saved.": "Tu preferencia de idioma ha sido guardada.",
      "Error": "Error",
      "Failed to update language preference.": "No se pudo actualizar la preferencia de idioma.",
      "Loading language preferences...": "Cargando preferencias de idioma...",
      "Choose your preferred language. This will be used across the entire application.": "Elige tu idioma preferido. Se utilizará en toda la aplicación."
    }
  },
  fr: {
    translations: {
      "Language Settings": "Paramètres de langue",
      "Choose your preferred language": "Choisissez votre langue préférée",
      "This will be the default language used throughout the application": "Ce sera la langue par défaut utilisée dans toute l'application",
      "Preferred Language": "Langue préférée",
      "Language updated": "Langue mise à jour",
      "Your language preference has been saved.": "Vos préférences de langue ont été enregistrées.",
      "Error": "Erreur",
      "Failed to update language preference.": "Impossible de mettre à jour les préférences de langue.",
      "Loading language preferences...": "Chargement des préférences de langue...",
      "Choose your preferred language. This will be used across the entire application.": "Choisissez votre langue préférée. Elle sera utilisée dans toute l'application."
    }
  }
};

export const TranslationSettings = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Add translations to i18n instance
  useEffect(() => {
    Object.keys(translations).forEach(lang => {
      i18n.addResourceBundle(lang, 'translations', translations[lang].translations, true, true);
    });
  }, [i18n]);

  // Fetch user's language settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["contractorSettings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("preferred_language")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update language preference mutation
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
      await i18n.changeLanguage(language);
      
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

  // Effect to handle initial language setup
  useEffect(() => {
    const setupLanguage = async () => {
      // Get system language
      const systemLanguage = navigator.language.split('-')[0];
      
      // Check if we have a stored preference
      const storedPreference = localStorage.getItem('preferred_language');
      
      let preferredLanguage = 'en';

      if (settings?.preferred_language) {
        preferredLanguage = settings.preferred_language;
      } else if (storedPreference) {
        preferredLanguage = storedPreference;
      } else if (languages.some(lang => lang.code === systemLanguage)) {
        preferredLanguage = systemLanguage;
        // If we're using system language, save it as the user's preference
        updateLanguage.mutate(systemLanguage);
      }

      // Set the language
      await i18n.changeLanguage(preferredLanguage);
    };

    setupLanguage();
  }, [settings, i18n]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-4">
      <div className="text-sm text-muted-foreground">{t("Loading language preferences...")}</div>
    </div>;
  }

  return (
    <Card className="p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("Language Settings")}</h2>
        <p className="text-muted-foreground">
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
            value={settings?.preferred_language || i18n.language || 'en'}
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

