import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Question, QuestionOption } from "@/types/estimate";
import { Card } from "@/components/ui/card";

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
    if (question.multi_choice) {
      setShowNextButton(selectedOptions.length > 0);
    }
  }, [selectedOptions, question.multi_choice]);

  const handleSingleOptionSelect = (value: string) => {
    console.log('Selected single option:', value);
    setPressedOption(value);
    onSelect(question.id, [value]);
    
    if (!question.is_branching) {
      setTimeout(() => {
        setPressedOption(null);
        onNext();
      }, 300);
    }
  };

  const handleMultiOptionSelect = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    onSelect(question.id, newSelection);
  };

  if (!question.options || question.options.length === 0) {
    return (
      <Card className="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-sm">
        <p className="text-red-500 text-center">
          Error: No options available for this question. Please try again later.
        </p>
      </Card>
    );
  }

  const options = question.is_branching && question.options.length === 0
    ? [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' }
      ]
    : question.options;

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fadeIn">      
      {/* Progress bar */}
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
          <h2 className="text-xl font-bold text-gray-900">
            {question.question}
          </h2>
        </div>
        
        <div className="p-6">
          {question.multi_choice ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50 h-full",
                    selectedOptions.includes(option.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200"
                  )}
                  onClick={() => handleMultiOptionSelect(option.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={option.id}
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={() => handleMultiOptionSelect(option.id)}
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor={option.id}
                      className={cn(
                        "text-base cursor-pointer flex-1",
                        selectedOptions.includes(option.id) 
                          ? "text-gray-900 font-medium" 
                          : "text-gray-600"
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                </div>
              ))}
              {showNextButton && (
                <div className="col-span-full mt-6">
                  <Button 
                    className="w-full"
                    onClick={onNext}
                    size="lg"
                  >
                    {isLastQuestion ? "Generate Estimate" : "Next Question"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptions[0]}
              onValueChange={handleSingleOptionSelect}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {options.map((option) => (
                <div 
                  key={option.id} 
                  className={cn(
                    "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50 transform h-full",
                    selectedOptions[0] === option.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-gray-200",
                    pressedOption === option.id && "scale-[0.98]"
                  )}
                  onClick={() => handleSingleOptionSelect(option.id)}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={option.id} id={option.id} className="h-5 w-5" />
                    <Label
                      htmlFor={option.id}
                      className={cn(
                        "text-base cursor-pointer flex-1",
                        selectedOptions[0] === option.id 
                          ? "text-gray-900 font-medium" 
                          : "text-gray-600"
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                </div>
              ))}
              {question.is_branching && selectedOptions[0] && (
                <div className="col-span-full mt-6">
                  <Button 
                    className="w-full"
                    onClick={onNext}
                    size="lg"
                  >
                    {isLastQuestion ? "Generate Estimate" : "Next Question"}
                  </Button>
                </div>
              )}
            </RadioGroup>
          )}
        </div>
      </Card>
    </div>
  );
};