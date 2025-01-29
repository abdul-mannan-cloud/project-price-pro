import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
}

export const QuestionCard = ({
  question,
  options,
  selectedOption,
  onSelect,
  onNext,
  isLastQuestion,
}: QuestionCardProps) => {
  const handleOptionSelect = (value: string) => {
    onSelect(value);
    // Auto-advance to next question after selection
    setTimeout(onNext, 500);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm animate-fadeIn">
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
              "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer",
              selectedOption === option.id 
                ? "border-primary bg-primary/5" 
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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
    </div>
  );
};