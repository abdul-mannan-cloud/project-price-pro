import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/3d-button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { Check, Square, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, values: string[]) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
  currentStage: number;
  totalStages: number;
  hasFollowUpQuestion?: boolean;
}

export const QuestionCard = ({
  question,
  selectedOptions,
  onSelect,
  onNext,
  isLastQuestion,
  currentStage,
  totalStages,
  hasFollowUpQuestion = true,
}: QuestionCardProps) => {
  const [showNextButton, setShowNextButton] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (question.type === 'multiple_choice') {
      setShowNextButton(selectedOptions.length > 0);
    } else {
      setShowNextButton(selectedOptions.length === 1);
    }
  }, [selectedOptions, question.type]);

  const handleOptionClick = (value: string) => {
    if (question.type === 'multiple_choice') {
      const newSelection = selectedOptions.includes(value)
        ? selectedOptions.filter(v => v !== value)
        : [...selectedOptions, value];
      onSelect(question.id, newSelection);
    } else {
      onSelect(question.id, [value]);
    }
  };

  const shouldShowImage = (option: any) => {
    if (!option.image_url) return false;
    if (option.image_url.includes('example')) return false;
    if (!isNaN(option.value)) return false;
    return true;
  };

  const options = Array.isArray(question?.options) ? question.options : [];

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto p-6 relative">
        {isMobile && (
          <button
            onClick={() => window.history.back()}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
        <h2 className="text-2xl font-semibold mb-6">{question?.question}</h2>

        <div className="grid grid-cols-1 gap-4 mb-20 md:mb-24">
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option.value);
            const showImage = shouldShowImage(option);
            
            return (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "cursor-pointer transition-all hover:text-primary",
                  showImage ? "py-4" : "py-3",
                  "flex items-start gap-3 relative group border-b border-gray-100 last:border-0"
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
                      "flex-shrink-0 h-5 w-5 rounded border mt-0.5",
                      isSelected ? "bg-primary border-primary" : "border-gray-300",
                      "flex items-center justify-center"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  ) : (
                    <div className={cn(
                      "flex-shrink-0 h-5 w-5 rounded-full border mt-0.5",
                      isSelected ? "bg-primary border-primary" : "border-gray-300"
                    )}>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white m-1" />
                      )}
                    </div>
                  )}
                  <span className={cn(
                    "text-lg flex-grow",
                    isSelected && "text-primary font-medium"
                  )}>{option.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom button bar */}
        {question.type === 'multiple_choice' && showNextButton && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
            <div className="container max-w-6xl mx-auto">
              <Button 
                onClick={onNext}
                disabled={!showNextButton}
                className="w-full"
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