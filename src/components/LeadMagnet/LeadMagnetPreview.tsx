import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Copy, ExternalLink, SkipForward } from "lucide-react";

export const LeadMagnetPreview = () => {
  const { toast } = useToast();

  const { data: contractor } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const estimatorUrl = `${window.location.origin}/estimate/${contractor?.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(estimatorUrl);
      toast({
        title: "Link copied!",
        description: "The estimator link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the link manually.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    window.open(estimatorUrl, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-8 animate-fadeIn">
      <div className="card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              🛠 {contractor?.business_name} Project Estimator
            </h2>
            <p className="text-muted-foreground">
              🕒 Quickly estimate your project cost in minutes! Simply take or upload a photo 
              of what you want to repair or modify (e.g., 'paint this wall').
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-lg mb-6">
          {/* Placeholder for Rive animation */}
          <div className="w-full h-64 bg-primary/5 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Animation Preview</p>
          </div>
        </div>

        <div className="space-y-4">
          <Button className="w-full" size="lg">
            <Camera className="mr-2" />
            TAKE A PHOTO
          </Button>
          <Button variant="ghost" className="w-full" size="lg">
            <SkipForward className="mr-2" />
            Skip
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button className="flex-1" onClick={handleCopyLink}>
          <Copy className="mr-2" />
          Copy Link
        </Button>
        <Button className="flex-1" onClick={handlePreview}>
          <ExternalLink className="mr-2" />
          Preview
        </Button>
      </div>
    </div>
  );
};