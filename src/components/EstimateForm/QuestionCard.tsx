import { useState, useEffect, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/3d-button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { Check, AlertTriangle, Square, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Contractor = Database['public']['Tables']['contractors']['Row'];

interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[];
  onSelect: (questionId: string, values: string[]) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
  currentStage: number;
  totalStages: number;
  hasFollowUpQuestion?: boolean;
}

export const QuestionCard = ({
  question,
  selectedAnswers = [],
  onSelect,
  onNext,
  isLastQuestion,
  currentStage,
  totalStages,
  hasFollowUpQuestion = true,
}: QuestionCardProps) => {
  const [showNextButton, setShowNextButton] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const questionLoadTime = useRef<number>(0);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { contractorId } = useParams();

  // Fetch contractor data to get branding colors
  const { data: contractor } = useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", contractorId)
        .single();
      if (error) throw error;
      return data as Contractor;
    },
    enabled: !!contractorId
  });

  // Safely extract primary color from branding_colors
  const primaryColor = typeof contractor?.branding_colors === 'object' && contractor?.branding_colors !== null
    ? (contractor.branding_colors as { primary?: string })?.primary
    : "#9b87f5";

  useEffect(() => {
    // Reset the load time whenever the question changes
    questionLoadTime.current = Date.now();
    setShowNextButton(question.type === 'multiple_choice' ? selectedAnswers.length > 0 : selectedAnswers.length === 1);
    setIsProcessing(false);
  }, [question.id, selectedAnswers]);

  const handleOptionClick = async (value: string) => {
    if (question.type === 'multiple_choice') {
      const newSelection = selectedAnswers.includes(value)
        ? selectedAnswers.filter(v => v !== value)
        : [...selectedAnswers, value];
      onSelect(question.id, newSelection);
    } else {
      if (isProcessing) return;
      setIsProcessing(true);
      
      const currentTime = Date.now();
      const timeSinceQuestionLoad = currentTime - questionLoadTime.current;
      
      if (timeSinceQuestionLoad < 400) {
        toast({
          title: "Please read carefully",
          description: (
            <div className="flex flex-col items-center gap-4">
              <p>Take a moment to review your selection before proceeding</p>
              <Button 
                onClick={() => {
                  const toastElement = document.querySelector('[role="status"]');
                  if (toastElement) {
                    toastElement.remove();
                  }
                }}
                variant="outline"
                size="sm"
              >
                OK
              </Button>
            </div>
          ),
          duration: 2000,
          className: "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50",
          variant: "warning",
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        });
        setIsProcessing(false);
        return;
      }
      
      onSelect(question.id, [value]);
      
      setTimeout(() => {
        setIsProcessing(false);
        if (onNext) onNext();
      }, 200);
    }
  };

  const shouldShowImage = (option: any) => {
    if (!option.image_url) return false;
    if (option.image_url.includes('example')) return false;
    if (!isNaN(option.value)) return false;
    return true;
  };

  const options = Array.isArray(question?.options) ? question.options : [];

  const buttonStyle = {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
    borderBottomColor: `${primaryColor}dd`,
    "--tw-border-opacity": "1",
    borderBottomWidth: "4px",
  } as React.CSSProperties;

  return (
    <>
      <Card className={cn(
        "w-full max-w-6xl mx-auto relative bg-white",
        isMobile ? "px-0 py-4 rounded-none" : "p-6 rounded-xl"
      )}>
        <h2 className={cn(
          "font-semibold mb-6",
          isMobile ? "text-base px-4" : "text-xl"
        )}>{question?.question}</h2>

        <div className={cn(
          "grid gap-4 mb-20 md:mb-6",
          isMobile ? "grid-cols-1 px-4" : question.type === 'multiple_choice' ? "grid-cols-2" : "grid-cols-1"
        )}>
          {options.map((option) => {
            const isSelected = selectedAnswers.includes(option.value);
            const showImage = shouldShowImage(option);
            
            return (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "cursor-pointer transition-all hover:text-primary border-b border-gray-100 last:border-0 pb-4",
                  showImage ? "py-4" : "py-3",
                )}
              >
                {showImage && (
                  <div className="w-full h-32 relative mb-2">
                    <img
                      src={option.image_url}
                      alt={option.label}
                      className="rounded-md w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 w-full">
                  {question.type === 'multiple_choice' ? (
                    <div className={cn(
                      "flex-shrink-0 h-6 w-6 rounded border mt-0.5",
                      isSelected ? "bg-primary border-primary" : "border-gray-300",
                      "flex items-center justify-center"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  ) : (
                    <div className={cn(
                      "flex-shrink-0 h-6 w-6 rounded-full border mt-0.5",
                      isSelected ? "bg-primary border-primary" : "border-gray-300"
                    )}>
                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-white m-1" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col w-full">
                    <span className={cn(
                      "text-lg flex-grow",
                      isSelected && "text-primary font-medium"
                    )}>{option.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop continue button */}
        {!isMobile && question.type === 'multiple_choice' && showNextButton && (
          <div className="hidden md:block w-full">
            <Button 
              onClick={onNext}
              className="button button-primary w-full"
              style={buttonStyle}
              size="lg"
            >
              {hasFollowUpQuestion ? 'Continue' : 'Complete'}
            </Button>
          </div>
        )}

        {/* Bottom button bar - only show on mobile */}
        {isMobile && question.type === 'multiple_choice' && showNextButton && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
            <div className="container max-w-6xl mx-auto">
              <Button 
                onClick={onNext}
                disabled={!showNextButton}
                className="button button-primary w-full"
                style={buttonStyle}
                size="lg"
              >
                {hasFollowUpQuestion ? 'Continue' : 'Complete'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
};
