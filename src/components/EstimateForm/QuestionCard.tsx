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
  onNext: () => void;
  isLastQuestion: boolean;
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
  const [pressedOption, setPressedOption] = useState<string | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);

  useEffect(() => {
    if (question.type === 'multiple_choice') {
      setShowNextButton(selectedOptions.length > 0);
    }
  }, [selectedOptions, question.type]);

  const handleSingleOptionSelect = (value: string) => {
    setPressedOption(value);
    onSelect(question.id, [value]);
    setTimeout(() => {
      setPressedOption(null);
      if (question.type !== 'multiple_choice') {
        onNext();
      }
    }, 300);
  };

  const handleMultiOptionSelect = (value: string) => {
    const newSelection = selectedOptions.includes(value)
      ? selectedOptions.filter((v) => v !== value)
      : [...selectedOptions, value];
    onSelect(question.id, newSelection);
  };

  const renderOptions = () => {
    if (question.type === 'multiple_choice') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
                selectedOptions.includes(option.value)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-gray-200"
              )}
              onClick={() => handleMultiOptionSelect(option.value)}
            >
              <div className="flex items-center space-x-4">
                <Checkbox
                  id={option.value}
                  checked={selectedOptions.includes(option.value)}
                  onCheckedChange={() => handleMultiOptionSelect(option.value)}
                  className="h-6 w-6 rounded-lg"
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
                  className="rounded-lg w-full h-32 object-cover mt-4"
                />
              )}
            </div>
          ))}
          {showNextButton && (
            <div className="col-span-full mt-6">
              <Button className="w-full" onClick={onNext} size="lg">
                {isLastQuestion ? "Generate Estimate" : "Next Question"}
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <RadioGroup
        value={selectedOptions[0]}
        onValueChange={handleSingleOptionSelect}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {question.options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
              selectedOptions[0] === option.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200",
              pressedOption === option.value && "scale-[0.98]"
            )}
            onClick={() => handleSingleOptionSelect(option.value)}
          >
            <div className="flex items-center space-x-4">
              <RadioGroupItem value={option.value} id={option.value} className="h-6 w-6" />
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
                className="rounded-lg w-full h-32 object-cover mt-4"
              />
            )}
          </div>
        ))}
      </RadioGroup>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fadeIn">
      <div className="mb-6">
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

      <Card className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{question.question}</h2>
          {question.description && (
            <p className="mt-2 text-gray-600">{question.description}</p>
          )}
        </div>
        <div className="p-6">{renderOptions()}</div>
      </Card>
    </div>
  );
};