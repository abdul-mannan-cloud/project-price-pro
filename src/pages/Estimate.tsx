import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, SkipForward, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StepIndicator } from "@/components/EstimateForm/StepIndicator";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { ContactForm } from "@/components/EstimateForm/ContactForm";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";

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
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<Array<{ question: string; options: string[] }>>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [estimate, setEstimate] = useState<any>(null);
  const [showContactForm, setShowContactForm] = useState(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

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

      const { data, error: uploadError } = await supabase.storage
        .from('project_images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project_images')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      toast({ title: "Success", description: "Image uploaded successfully" });
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

  const generateQuestions = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { projectDescription, imageUrl: uploadedImageUrl }
      });

      if (error) throw error;
      setQuestions(data.choices[0].message.content.questions);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateEstimate = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { projectDescription, imageUrl: uploadedImageUrl, answers }
      });

      if (error) throw error;
      setEstimate(data.choices[0].message.content);
      setShowContactForm(true);
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactSubmit = async (contactData: any) => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .insert([{
          contractor_id: contractor?.id,
          customer_name: contactData.fullName,
          customer_email: contactData.email,
          customer_phone: contactData.phone,
          project_address: contactData.address,
          project_description: projectDescription,
          total_cost: estimate.totalCost,
        }])
        .select()
        .single();

      if (error) throw error;

      // Save estimate details
      await supabase
        .from('estimate_details')
        .insert(
          estimate.groups.map((group: any) => ({
            estimate_id: data.id,
            group_name: group.name,
            line_items: group.items,
            total_amount: group.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0)
          }))
        );

      setShowContactForm(false);
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast({
        title: "Error",
        description: "Failed to save estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const brandColors = isBrandingColors(contractor?.branding_colors) 
    ? contractor.branding_colors 
    : {
        primary: "#6366F1",
        secondary: "#4F46E5"
      };

  if (isProcessing) {
    return <LoadingScreen message="Processing your request..." />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Progress 
        value={currentStep === 0 ? 0 : (currentStep / (questions.length + 2)) * 100} 
        className="h-2 rounded-none" 
      />
      
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

            <Textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe your project..."
              className="min-h-[150px] mb-6"
            />

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
                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={isUploading}
                  asChild
                >
                  <div>
                    <Camera className="mr-2" />
                    {isUploading ? "UPLOADING..." : "TAKE A PHOTO"}
                  </div>
                </Button>
              </label>
              <Button 
                variant="ghost" 
                className="w-full" 
                size="lg" 
                onClick={generateQuestions}
                disabled={!projectDescription.trim() || isUploading}
              >
                <SkipForward className="mr-2" />
                Continue
              </Button>
            </div>
          </div>
        ) : showContactForm ? (
          <div className="animate-fadeIn">
            <ContactForm onSubmit={handleContactSubmit} />
          </div>
        ) : estimate ? (
          <EstimateDisplay groups={estimate.groups} totalCost={estimate.totalCost} />
        ) : (
          <>
            <StepIndicator 
              currentStep={currentStep - 1} 
              totalSteps={questions.length} 
            />
            <QuestionCard
              question={questions[currentStep - 1].question}
              options={questions[currentStep - 1].options.map((option, index) => ({
                id: index.toString(),
                label: option
              }))}
              selectedOption={answers[currentStep - 1] || ""}
              onSelect={(value) => setAnswers(prev => ({ ...prev, [currentStep - 1]: value }))}
              onNext={() => {
                if (currentStep < questions.length) {
                  setCurrentStep(prev => prev + 1);
                } else {
                  generateEstimate();
                }
              }}
              isLastQuestion={currentStep === questions.length}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EstimatePage;