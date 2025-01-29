import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  isLastQuestion?: boolean;
}

export const QuestionCard = ({
  question,
  options,
  selectedOption,
  onSelect,
  onNext,
  isLastQuestion = false,
}: QuestionCardProps) => {
  const handleOptionSelect = (value: string) => {
    onSelect(value);
    // Auto-advance after selection
    setTimeout(() => onNext(), 500);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold mb-6 text-foreground">{question}</h2>
      <RadioGroup
        value={selectedOption}
        onValueChange={handleOptionSelect}
        className="space-y-4"
      >
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-primary-100 transition-colors cursor-pointer"
            onClick={() => handleOptionSelect(option.id)}
          >
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-grow cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
};