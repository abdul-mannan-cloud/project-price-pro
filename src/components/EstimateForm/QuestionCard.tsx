import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, values: string[]) => void;
  isLastQuestion: boolean;
  currentStage: number;
  totalStages: number;
  onNext?: () => void;
}

export const QuestionCard = ({
  question,
  selectedOptions,
  onSelect,
  isLastQuestion,
  currentStage,
  totalStages,
  onNext,
}: QuestionCardProps) => {
  const [showNextButton, setShowNextButton] = useState(false);

  useEffect(() => {
    setShowNextButton(
      question.type === 'multiple_choice' && selectedOptions.length > 0
    );
  }, [selectedOptions, question.type]);

  const handleOptionSelect = (value: string) => {
    if (question.type === 'multiple_choice') {
      const newSelection = selectedOptions.includes(value)
        ? selectedOptions.filter(v => v !== value)
        : [...selectedOptions, value];
      onSelect(question.id, newSelection);
    } else {
      onSelect(question.id, [value]);
    }
  };

  const renderOptions = () => {
    if (question.type === 'multiple_choice') {
      return (
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
                selectedOptions.includes(option.value)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-gray-200"
              )}
              onClick={() => handleOptionSelect(option.value)}
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={option.value}
                  checked={selectedOptions.includes(option.value)}
                  onCheckedChange={() => handleOptionSelect(option.value)}
                  className="h-5 w-5"
                />
                <Label
                  htmlFor={option.value}
                  className={cn(
                    "text-base cursor-pointer flex-1",
                    selectedOptions.includes(option.value)
                      ? "text-gray-900 font-medium"
                      : "text-gray-600"
                  )}
                >
                  {option.label}
                </Label>
              </div>
              {option.image_url && (
                <img
                  src={option.image_url}
                  alt={option.label}
                  className="mt-3 rounded-lg w-full h-32 object-cover"
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <RadioGroup
        value={selectedOptions[0]}
        onValueChange={(value) => handleOptionSelect(value)}
        className="grid grid-cols-1 gap-3"
      >
        {question.options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
              selectedOptions[0] === option.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200"
            )}
            onClick={() => handleOptionSelect(option.value)}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="h-5 w-5"
              />
              <Label
                htmlFor={option.value}
                className={cn(
                  "text-base cursor-pointer flex-1",
                  selectedOptions[0] === option.value
                    ? "text-gray-900 font-medium"
                    : "text-gray-600"
                )}
              >
                {option.label}
              </Label>
            </div>
            {option.image_url && (
              <img
                src={option.image_url}
                alt={option.label}
                className="mt-3 rounded-lg w-full h-32 object-cover"
              />
            )}
          </div>
        ))}
      </RadioGroup>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fadeIn">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentStage} of {totalStages}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round((currentStage / totalStages) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStage / totalStages) * 100}%` }}
          />
        </div>
      </div>

      <Card className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {question.question}
          </h2>
          {question.description && (
            <p className="mt-2 text-gray-600">{question.description}</p>
          )}
        </div>
        
        <div className="p-6">
          {renderOptions()}
          {showNextButton && onNext && (
            <div className="mt-6">
              <Button
                className="w-full"
                onClick={onNext}
                size="lg"
              >
                {isLastQuestion ? "Complete" : "Continue"}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};