import { useState } from "react";
import { StepIndicator } from "@/components/EstimateForm/StepIndicator";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";
import { Button } from "@/components/ui/button";
import { Camera, SkipForward } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const INITIAL_QUESTIONS = [
  {
    id: "project-type",
    question: "What type of home improvement project are you planning?",
    options: [
      { id: "kitchen", label: "Kitchen Remodel" },
      { id: "bathroom", label: "Bathroom Remodel" },
      { id: "addition", label: "Room Addition" },
      { id: "deck", label: "Deck Construction" },
    ],
  },
  {
    id: "project-size",
    question: "What is the approximate size of your project?",
    options: [
      { id: "small", label: "Small (Under 100 sq ft)" },
      { id: "medium", label: "Medium (100-250 sq ft)" },
      { id: "large", label: "Large (250-500 sq ft)" },
      { id: "xlarge", label: "Extra Large (500+ sq ft)" },
    ],
  },
  {
    id: "timeline",
    question: "When would you like to start this project?",
    options: [
      { id: "immediate", label: "As soon as possible" },
      { id: "1-3months", label: "Within 1-3 months" },
      { id: "3-6months", label: "Within 3-6 months" },
      { id: "6months+", label: "More than 6 months from now" },
    ],
  },
];

const EstimatePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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

  const handleOptionSelect = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [INITIAL_QUESTIONS[currentStep].id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < INITIAL_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Handle estimate generation
      console.log("Generate estimate with answers:", answers);
    }
  };

  const brandColors = isBrandingColors(contractor?.branding_colors) 
    ? contractor.branding_colors 
    : {
        primary: "#6366F1",
        secondary: "#4F46E5"
      };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-100 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-primary mb-8">
          Project Estimate Calculator
        </h1>
        <StepIndicator
          currentStep={currentStep}
          totalSteps={INITIAL_QUESTIONS.length}
        />
        
        {currentStep === 0 ? (
          <div className="card p-8 animate-fadeIn">
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
        ) : (
          <QuestionCard
            question={INITIAL_QUESTIONS[currentStep - 1].question}
            options={INITIAL_QUESTIONS[currentStep - 1].options}
            selectedOption={answers[INITIAL_QUESTIONS[currentStep - 1].id] || ""}
            onSelect={handleOptionSelect}
            onNext={handleNext}
            isLastQuestion={currentStep === INITIAL_QUESTIONS.length}
          />
        )}
      </div>
    </div>
  );
};

export default EstimatePage;