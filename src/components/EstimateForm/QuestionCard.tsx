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
  onSelect: (questionId: string, value: string[], selectedLabel: string) => void;
  isLastQuestion: boolean;
  currentStage: number;
  totalStages: number;
  onNext?: () => void;  // Added this optional prop
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
  const [pressedOption, setPressedOption] = useState<string | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);

  const isYesNoQuestion = question.selections?.length === 2 && 
                         question.selections[0] === 'Yes' && 
                         question.selections[1] === 'No';

  useEffect(() => {
    // Only show next button for multi-choice questions
    if (question.multi_choice) {
      setShowNextButton(selectedOptions.length > 0);
    } else if (!isYesNoQuestion) {
      // Show next button for non-yes/no single choice questions after selection
      setShowNextButton(selectedOptions.length === 1);
    } else {
      setShowNextButton(false);
    }
  }, [selectedOptions, question.multi_choice, isYesNoQuestion]);

  const handleSingleOptionSelect = (value: string, label: string) => {
    setPressedOption(value);
    onSelect(question.id || '', [value], label);
    if (!showNextButton && onNext) {
      onNext();
    }
  };

  const handleMultiOptionSelect = (optionId: string, label: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    const selectedLabels = question.options?.filter(opt => 
      newSelection.includes(opt.id || '')
    ).map(opt => opt.label).join(', ');
    
    onSelect(question.id || '', newSelection, selectedLabels);
  };

  const renderOptions = () => {
    const options = question.options || [];
    
    if (question.multi_choice) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
                selectedOptions.includes(option.id || '')
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-gray-200"
              )}
              onClick={() => handleMultiOptionSelect(option.id || '', option.label)}
            >
              <div className="flex items-center space-x-4">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id || '')}
                  onCheckedChange={() => handleMultiOptionSelect(option.id || '', option.label)}
                  className="h-6 w-6 rounded-lg"
                />
                <Label
                  htmlFor={option.id}
                  className={cn(
                    "text-base cursor-pointer flex-1",
                    selectedOptions.includes(option.id || '') 
                      ? "text-gray-900 font-medium" 
                      : "text-gray-600"
                  )}
                >
                  {option.label}
                </Label>
              </div>
            </div>
          ))}
          {showNextButton && onNext && (
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
      );
    }

    return (
      <RadioGroup
        value={selectedOptions[0]}
        onValueChange={(value) => {
          const option = options.find(opt => opt.id === value);
          if (option) {
            handleSingleOptionSelect(value, option.label);
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {options.map((option) => (
          <div 
            key={option.id}
            className={cn(
              "relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50",
              selectedOptions[0] === option.id 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-gray-200",
              pressedOption === option.id && "scale-[0.98]"
            )}
            onClick={() => {
              const opt = options.find(o => o.id === option.id);
              if (opt) {
                handleSingleOptionSelect(option.id || '', opt.label);
              }
            }}
          >
            <div className="flex items-center space-x-4">
              <RadioGroupItem 
                value={option.id || ''} 
                id={option.id} 
                className="h-6 w-6"
              />
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
        {showNextButton && onNext && (
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
          <h2 className="text-xl font-bold text-gray-900">
            {question.question}
          </h2>
          {question.order && (
            <span className="text-sm text-gray-500">
              (Order: {question.order})
            </span>
          )}
        </div>
        
        <div className="p-6">
          {renderOptions()}
        </div>
      </Card>
    </div>
  );
};