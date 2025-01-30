import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Question, QuestionOption } from "@/types/estimate";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, value: string[]) => void;
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
    // Show next button for multi-choice questions only when at least one option is selected
    if (question.multi_choice) {
      setShowNextButton(selectedOptions.length > 0);
    }
  }, [selectedOptions, question.multi_choice]);

  const handleSingleOptionSelect = (value: string) => {
    setPressedOption(value);
    onSelect(question.id, [value]);
    
    // Only auto-advance if it's not a branching question
    if (!question.is_branching) {
      setTimeout(() => {
        setPressedOption(null);
        setTimeout(onNext, 200);
      }, 150);
    }
  };

  const handleMultiOptionSelect = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    onSelect(question.id, newSelection);
  };

  if (question.options.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <p className="text-red-500">Error: No options available for this question.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm animate-fadeIn">      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Progress
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round((currentStage / totalStages) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStage / totalStages) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
      
      {question.multi_choice ? (
        <div className="space-y-4">
          {question.options.map((option) => (
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
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={() => handleMultiOptionSelect(option.id)}
                />
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
          {showNextButton && (
            <Button 
              className="w-full mt-6"
              onClick={onNext}
            >
              {isLastQuestion ? "View Estimate" : "Next"}
            </Button>
          )}
        </div>
      ) : (
        <RadioGroup
          value={selectedOptions[0]}
          onValueChange={handleSingleOptionSelect}
          className="space-y-4"
        >
          {question.options.map((option) => (
            <div 
              key={option.id} 
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer transform",
                selectedOptions[0] === option.id 
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
                    selectedOptions[0] === option.id ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </Label>
              </div>
            </div>
          ))}
          {question.is_branching && selectedOptions[0] && (
            <Button 
              className="w-full mt-6"
              onClick={onNext}
            >
              Next
            </Button>
          )}
        </RadioGroup>
      )}
    </div>
  );
};