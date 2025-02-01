import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/estimate";
import { Card } from "@/components/ui/card";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, values: string[]) => void;
  onNext?: () => void;
  currentStage: number;
  totalStages: number;
}

export const QuestionCard = ({
  question,
  selectedOptions,
  onSelect,
  onNext,
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

  const handleOptionSelect = (value: string) => {
    if (question.type === 'multiple_choice') {
      const newSelection = selectedOptions.includes(value)
        ? selectedOptions.filter(v => v !== value)
        : [...selectedOptions, value];
      onSelect(question.id, newSelection);
    } else {
      onSelect(question.id, [value]);
      if (onNext && (question.type === 'single_choice' || question.type === 'yes_no')) {
        setTimeout(onNext, 300);
      }
    }
  };

  const renderOptions = () => {
    if (question.type === 'multiple_choice') {
      return (
        <div className="space-y-4">
          {question.options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex flex-col space-y-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
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
                />
                <Label htmlFor={option.value} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
              {option.image_url && (
                <img
                  src={option.image_url}
                  alt={option.label}
                  className="rounded-lg w-full h-32 object-cover"
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
        className="space-y-4"
      >
        {question.options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex flex-col space-y-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
              selectedOptions[0] === option.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200"
            )}
            onClick={() => handleOptionSelect(option.value)}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
            {option.image_url && (
              <img
                src={option.image_url}
                alt={option.label}
                className="rounded-lg w-full h-32 object-cover"
              />
            )}
          </div>
        ))}
      </RadioGroup>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
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
              <Button className="w-full" onClick={onNext} size="lg">
                Continue
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};