import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

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
      <Card className="w-full max-w-4xl mx-auto p-6 relative pb-24 md:pb-6">
        <h2 className="text-2xl font-semibold mb-6">{question?.question}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option.value);
            const showImage = shouldShowImage(option);
            
            return (
              <Button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "h-auto transition-all hover:border-primary hover:bg-primary/5",
                  showImage ? "py-4 px-6" : "py-3 px-4",
                  "flex flex-col items-center gap-3 relative group",
                  isSelected && question.type === 'multiple_choice' && "border-primary border-2",
                  !showImage && "items-start text-left"
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
                <span className={cn(
                  "text-lg",
                  !showImage && "text-left w-full"
                )}>{option.label}</span>
                
                {isSelected && question.type === 'multiple_choice' && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Desktop button - inside card */}
        {question.type === 'multiple_choice' && showNextButton && (
          <div className="hidden md:block absolute bottom-6 left-6 right-6">
            <Button 
              onClick={onNext}
              disabled={!showNextButton}
              className="w-full"
            >
              {hasFollowUpQuestion ? 'Continue' : 'Complete'}
            </Button>
          </div>
        )}
      </Card>

      {/* Mobile button - sticky bottom */}
      {question.type === 'multiple_choice' && showNextButton && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
          <div className="container max-w-4xl mx-auto">
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
    </>
  );
};