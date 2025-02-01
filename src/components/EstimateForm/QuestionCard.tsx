import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, values: string[]) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
  currentStage: number;
  totalStages: number;
}

export const QuestionCard = ({
  question,
  selectedOptions,
  onSelect,
  onNext,
  isLastQuestion,
  currentStage,
  totalStages,
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

  const progress = (currentStage / totalStages) * 100;

  const shouldShowImage = (option: any) => {
    if (!option.image_url) return false;
    if (option.image_url.includes('example')) return false;
    if (!isNaN(option.value)) return false;
    return true;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-gray-500 mt-2 text-right">
          Question {currentStage} of {totalStages}
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-6">{question.question}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
        {question.options.map((option) => {
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

      {question.type === 'multiple_choice' && showNextButton && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="container max-w-4xl mx-auto">
            <Button 
              onClick={onNext}
              disabled={!showNextButton}
              className="w-full"
            >
              {isLastQuestion ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};