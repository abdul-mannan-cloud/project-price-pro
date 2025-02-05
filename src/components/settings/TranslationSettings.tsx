import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
];

export const TranslationSettings = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const { data: settings } = useQuery({
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

  const updateLanguage = useMutation({
    mutationFn: async (language: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update({ preferred_language: language })
        .eq("id", user.id);

      if (error) throw error;
      await i18n.changeLanguage(language);
    },
    onSuccess: () => {
      toast({
        title: "Language updated",
        description: "Your language preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update language preference.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Preferred Language</label>
        <Select
          value={settings?.preferred_language || "en"}
          onValueChange={(value) => updateLanguage.mutate(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};