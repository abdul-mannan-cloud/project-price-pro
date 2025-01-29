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
  return (
    <div className="card p-8 animate-fadeIn">
      <h2 className="text-xl font-semibold mb-6">{question}</h2>
      
      <RadioGroup
        value={selectedOption}
        onValueChange={onSelect}
        className="space-y-4"
      >
        {options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label
              htmlFor={option.id}
              className={cn(
                "text-base cursor-pointer",
                selectedOption === option.id ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <Button
        className="w-full mt-8"
        onClick={onNext}
        disabled={!selectedOption}
      >
        {isLastQuestion ? "Generate Estimate" : "Next Question"}
      </Button>
    </div>
  );
};