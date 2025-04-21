import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";

export const LogoUpload = ({ currentLogo }: { currentLogo?: string | null }) => {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business_logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business_logos')
        .getPublicUrl(filePath);

      // Update contractor
      const { error: updateError } = await supabase
        .from('contractors')
        .update({ business_logo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["contractor"] });
      toast({
        title: "Logo updated",
        description: "Your business logo has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentLogo && (
        <div className="w-32 h-32 rounded-lg border overflow-hidden ">
          <img
            src={currentLogo}
            alt="Business Logo"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-4 relative">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="logo-upload"
        />
        <Button
          asChild
          variant="outline"
          disabled={uploading}
          className="absolute left-0"
        >
          <label htmlFor="logo-upload" className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Logo"}
          </label>
        </Button>
      </div>
    </div>
  );
};