import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, SkipForward } from "lucide-react";
import { useState } from "react";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";

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
  const [questions, setQuestions] = useState<Array<{ question: string; options: Array<{ id: string; label: string }> }>>([]);

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

      setQuestions(data.questions);
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

  const handleNext = () => {
    if (currentStep === 0) {
      generateQuestions();
    } else if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1);
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

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-8 animate-fadeIn" style={{
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

          <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-lg mb-6">
            <div className="w-full h-64 bg-primary/5 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Animation Preview</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button className="w-full" size="lg" onClick={handleNext}>
              <Camera className="mr-2" />
              TAKE A PHOTO
            </Button>
            <Button variant="ghost" className="w-full" size="lg" onClick={handleNext}>
              <SkipForward className="mr-2" />
              Skip
            </Button>
          </div>
        </div>
      )}

      {currentStep > 0 && currentStep <= questions.length && (
        <QuestionCard
          question={questions[currentStep - 1].question}
          options={questions[currentStep - 1].options}
          selectedOption={selectedOptions[currentStep - 1] || ""}
          onSelect={handleOptionSelect}
          onNext={handleNext}
          isLastQuestion={currentStep === questions.length}
          currentQuestionIndex={currentStep - 1}
          totalQuestions={questions.length}
        />
      )}
    </div>
  );
};