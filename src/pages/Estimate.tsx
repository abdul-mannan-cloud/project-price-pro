import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, SkipForward, ArrowLeft, Brush } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface BrandingColors {
  primary: string;
  secondary: string;
}

const isBrandingColors = (value: unknown): value is BrandingColors => {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.primary === 'string' &&
    typeof obj.secondary === 'string'
  );
};

const EstimatePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [projectDescription, setProjectDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: contractor } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const brandColors = isBrandingColors(contractor?.branding_colors) 
    ? contractor.branding_colors 
    : {
        primary: "#007AFF",
        secondary: "#F5F5F7"
      };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project_images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      // Advance to next step
      setCurrentStep(1);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && projectDescription.trim()) {
      // Handle project description submission
      console.log("Project description:", projectDescription);
    }
  };

  const getProgress = () => {
    return currentStep === 0 ? 0 : currentStep === 1 ? 50 : 100;
  };

  return (
    <div className="min-h-screen bg-white">
      <Progress value={getProgress()} className="h-2 rounded-none" />
      
      {contractor && (
        <button 
          onClick={() => navigate("/dashboard")}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground flex items-center gap-2 p-2"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {currentStep === 0 ? (
          <div className="card p-8 animate-fadeIn">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  🛠 {contractor?.business_name || "Project"} Estimator
                </h2>
                <p className="text-muted-foreground">
                  🕒 Quickly estimate your project cost in minutes! Simply take or upload a photo 
                  of what you want to repair or modify (e.g., 'paint this wall').
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-lg mb-6">
              <div className="w-full h-64 bg-primary/5 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Animation Preview</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  capture="environment"
                  disabled={isUploading}
                />
                <Button className="w-full" size="lg" disabled={isUploading}>
                  <Camera className="mr-2" />
                  {isUploading ? "UPLOADING..." : "TAKE A PHOTO"}
                </Button>
              </label>
              <Button 
                variant="ghost" 
                className="w-full" 
                size="lg" 
                onClick={() => setCurrentStep(1)}
                disabled={isUploading}
              >
                <SkipForward className="mr-2" />
                Skip
              </Button>
            </div>
          </div>
        ) : (
          <div className="card p-8 animate-fadeIn">
            <div className="flex flex-col items-center mb-8">
              <Brush 
                size={40} 
                className="mb-4" 
                style={{ color: brandColors.primary }} 
              />
              <h2 className="text-2xl font-semibold text-center">
                Describe Your Project
              </h2>
              <p className="text-muted-foreground text-center mt-2">
                Include the type of work and any dimensions if you have them.
              </p>
            </div>

            <Textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g., Paint the living room walls (15' x 20')"
              className="min-h-[150px] mb-6"
            />

            <Button
              className="w-full"
              size="lg"
              disabled={!projectDescription.trim()}
              onClick={handleNext}
              style={{
                backgroundColor: projectDescription.trim() ? brandColors.primary : undefined,
                opacity: projectDescription.trim() ? 1 : 0.5
              }}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimatePage;