import { useState } from "react";
import { Check } from "lucide-react";
import { Question } from "@/types/estimate";

interface QuestionCardProps {
  question: Question;
  onAnswer: (questionId: string, value: string | string[]) => void;
  selectedAnswers?: string[];
}

export const QuestionCard = ({ question, onAnswer, selectedAnswers = [] }: QuestionCardProps) => {
  const [selected, setSelected] = useState<string[]>(selectedAnswers);

  const handleOptionSelect = (value: string) => {
    let newSelected: string[];
    
    if (question.type === 'multiple_choice') {
      newSelected = selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value];
    } else {
      newSelected = [value];
    }
    
    setSelected(newSelected);
    onAnswer(question.id, newSelected);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">{question.question}</h3>
      </div>
      
      <div className="space-y-1">
        {question.options.map((option, index) => (
          <div
            key={option.value}
            className={`
              flex items-center justify-between p-4 cursor-pointer
              hover:bg-gray-50 transition-colors
              ${index !== question.options.length - 1 ? 'border-b border-gray-100' : ''}
            `}
            onClick={() => handleOptionSelect(option.value)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  h-6 w-6 rounded-md border-2 flex items-center justify-center
                  ${selected.includes(option.value)
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                  }
                `}
              >
                {selected.includes(option.value) && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-sm font-medium">
                {option.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};