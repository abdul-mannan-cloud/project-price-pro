
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, SkipForward } from "lucide-react";
import { useState } from "react";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";
import { Question } from "@/types/estimate";
import { PhotoUpload } from "@/components/EstimateForm/PhotoUpload";
import { ContactForm } from "@/components/EstimateForm/ContactForm";

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

export const LeadMagnetPreview = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<any>(null);
  const [isProcessingEstimate, setIsProcessingEstimate] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const { data: contractor } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const generateQuestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { 
          projectDescription: "New project inquiry",
          previousAnswers: selectedOptions
        }
      });

      if (error) throw error;
      if (!data?.questions) throw new Error('No questions generated');

      const formattedQuestions: Question[] = data.questions.map((q: any) => ({
        id: q.id || crypto.randomUUID(),
        question: q.question,
        options: q.options.map((opt: any) => ({
          id: opt.id || crypto.randomUUID(),
          label: opt.label
        })),
        multi_choice: q.multi_choice || false,
        is_branching: q.is_branching || false,
        sub_questions: q.sub_questions || []
      }));

      setQuestions(formattedQuestions);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOptionSelect = (value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [currentStep - 1]: value
    }));
  };

  const generateEstimateInBackground = async () => {
    try {
      setIsProcessingEstimate(true);
      const { data: estimateData, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          answers: selectedOptions,
          projectDescription: "New project inquiry",
          imageUrl: uploadedPhotos[0],
          category: "General"
        }
      });

      if (error) throw error;
      setEstimate(estimateData);
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Processing Estimate",
        description: "Your estimate is being generated and will be emailed to you shortly.",
      });
    } finally {
      setIsProcessingEstimate(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      generateQuestions();
    } else if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Create a lead and move to contact form
      try {
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({
            status: 'pending',
            contractor_id: contractor?.id,
            project_description: "New project inquiry",
            answers: selectedOptions,
            uploaded_photos: uploadedPhotos
          })
          .select()
          .single();

        if (leadError) throw leadError;
        
        setLeadId(lead.id);
        setCurrentStep(questions.length + 1);
        
        // Start estimate generation in background
        generateEstimateInBackground();
      } catch (error) {
        console.error('Error creating lead:', error);
        toast({
          title: "Error",
          description: "Failed to process your request. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleContactFormSubmit = async (contactData: any) => {
    if (!leadId) return;

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: contactData.fullName,
          user_email: contactData.email,
          user_phone: contactData.phone,
          project_address: contactData.address,
          status: estimate ? 'complete' : 'processing'
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Show success message
      toast({
        title: "Success!",
        description: "Your estimate request has been submitted. You'll receive an email shortly.",
      });

      // Reset form
      setCurrentStep(0);
      setSelectedOptions({});
      setUploadedPhotos([]);
      setEstimate(null);
      setLeadId(null);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const steps = [
    { label: "Start", value: 0 },
    ...questions.map((_, index) => ({ 
      label: `Question ${index + 1}`, 
      value: index + 1 
    }))
  ];

  const brandColors = isBrandingColors(contractor?.branding_colors) 
    ? contractor.branding_colors 
    : {
        primary: "#6366F1",
        secondary: "#4F46E5"
      };

  const handlePhotosSelected = (urls: string[]) => {
    setUploadedPhotos(urls);
  };

  // Show contact form immediately after questions
  if (currentStep === questions.length + 1) {
    return (
      <ContactForm
        onSubmit={handleContactFormSubmit}
        leadId={leadId || undefined}
        contractorId={contractor?.id}
        estimate={estimate}
        contractor={contractor}
      />
    );
  }

  return (
    <div className="w-full mx-auto space-y-8 animate-fadeIn" style={{
      "--primary": brandColors.primary,
      "--secondary": brandColors.secondary,
    } as React.CSSProperties}>
      <ProgressSteps currentStep={currentStep} steps={steps} />
      
      {currentStep === 0 && (
        <div className="card p-8">
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

          <PhotoUpload
            onPhotosSelected={handlePhotosSelected}
            onNext={handleNext}
            uploadedPhotos={uploadedPhotos}
          />

          <Button variant="ghost" className="w-full mt-4" size="lg" onClick={handleNext}>
            <SkipForward className="mr-2" />
            Skip Photo
          </Button>
        </div>
      )}

      {currentStep > 0 && currentStep <= questions.length && (
        <QuestionCard
          question={questions[currentStep - 1]}
          selectedAnswers={selectedOptions[currentStep - 1] ? [selectedOptions[currentStep - 1]] : []}
          onSelect={(questionId, value) => handleOptionSelect(value[0])}
          onNext={handleNext}
          isLastQuestion={currentStep === questions.length}
          currentStage={currentStep}
          totalStages={questions.length}
        />
      )}
    </div>
  );
};
