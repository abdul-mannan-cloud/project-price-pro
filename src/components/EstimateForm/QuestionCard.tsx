import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

  return (
    <Card className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-gray-500 mt-2 text-right">
          Question {currentStage} of {totalStages}
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-6">{question.question}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {question.options.map((option) => (
          <Button
            key={option.value}
            onClick={() => handleOptionClick(option.value)}
            variant={selectedOptions.includes(option.value) ? "default" : "outline"}
            className="h-auto py-4 px-6 flex flex-col items-center gap-3 relative"
          >
            {option.image_url && (
              <div className="w-full h-32 relative mb-2">
                <img
                  src={option.image_url}
                  alt={option.label}
                  className="rounded-md w-full h-full object-cover"
                />
              </div>
            )}
            <span className="text-lg">{option.label}</span>
          </Button>
        ))}
      </div>

      {question.type === 'multiple_choice' && showNextButton && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={onNext}
            disabled={!showNextButton}
          >
            {isLastQuestion ? 'Complete' : 'Next'}
          </Button>
        </div>
      )}
    </Card>
  );
};