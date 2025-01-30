import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

interface Option {
  id: string;
  label: string;
}

interface QuestionCardProps {
  question: string;
  options: Option[];
  selectedOption: string;
  selectedOptions?: string[];
  onSelect: (value: string | string[]) => void;
  onNext: () => void;
  isLastQuestion: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  isMultiChoice?: boolean;
}

export const QuestionCard = ({
  question,
  options,
  selectedOption,
  selectedOptions = [],
  onSelect,
  onNext,
  isLastQuestion,
  currentQuestionIndex,
  totalQuestions,
  isMultiChoice = false,
}: QuestionCardProps) => {
  const [pressedOption, setPressedOption] = useState<string | null>(null);

  const handleSingleOptionSelect = (value: string) => {
    setPressedOption(value);
    onSelect(value);
    
    setTimeout(() => {
      setPressedOption(null);
      if (!isLastQuestion) {
        setTimeout(onNext, 200);
      }
    }, 150);
  };

  const handleMultiOptionSelect = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    onSelect(newSelection);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm animate-fadeIn">
      <h2 className="text-xl font-semibold mb-6">{question}</h2>
      
      {isMultiChoice ? (
        <div className="space-y-4">
          {options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                selectedOptions.includes(option.id)
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
              onClick={() => handleMultiOptionSelect(option.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CheckSquare 
                    className={cn(
                      "w-6 h-6 rounded-lg transition-colors",
                      selectedOptions.includes(option.id)
                        ? "text-primary"
                        : "text-gray-300"
                    )}
                  />
                </div>
                <Label
                  htmlFor={option.id}
                  className={cn(
                    "text-base cursor-pointer flex-1",
                    selectedOptions.includes(option.id) ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </Label>
              </div>
            </div>
          ))}
          {selectedOptions.length > 0 && (
            <Button 
              className="w-full mt-6"
              onClick={() => onNext()}
            >
              {isLastQuestion ? "Submit and View Estimate" : "Next Question"}
            </Button>
          )}
        </div>
      ) : (
        <RadioGroup
          value={selectedOption}
          onValueChange={handleSingleOptionSelect}
          className="space-y-4"
        >
          {options.map((option) => (
            <div 
              key={option.id} 
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer transform",
                selectedOption === option.id 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                pressedOption === option.id && "scale-[0.98]"
              )}
              onClick={() => handleSingleOptionSelect(option.id)}
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label
                  htmlFor={option.id}
                  className={cn(
                    "text-base cursor-pointer flex-1",
                    selectedOption === option.id ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </Label>
              </div>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
};