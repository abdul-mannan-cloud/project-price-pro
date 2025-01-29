import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface Option {
  id: string;
  label: string;
}

interface QuestionCardProps {
  question: string;
  options: Option[];
  selectedOption: string;
  onSelect: (value: string) => void;
  onNext: () => void;
  isLastQuestion: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
}

export const QuestionCard = ({
  question,
  options,
  selectedOption,
  onSelect,
  onNext,
  isLastQuestion,
  currentQuestionIndex,
  totalQuestions,
}: QuestionCardProps) => {
  const [pressedOption, setPressedOption] = useState<string | null>(null);
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleOptionSelect = (value: string) => {
    setPressedOption(value);
    onSelect(value);
    
    // Add a small delay for the press animation
    setTimeout(() => {
      setPressedOption(null);
      // Auto-advance to next question after selection
      setTimeout(onNext, 200);
    }, 150);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm animate-fadeIn">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      <h2 className="text-xl font-semibold mb-6">{question}</h2>
      
      <RadioGroup
        value={selectedOption}
        onValueChange={handleOptionSelect}
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
            onClick={() => handleOptionSelect(option.id)}
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

      {!isLastQuestion && (
        <Button 
          className="w-full mt-6" 
          onClick={onNext}
          disabled={!selectedOption}
        >
          Next Question
        </Button>
      )}
    </div>
  );
};