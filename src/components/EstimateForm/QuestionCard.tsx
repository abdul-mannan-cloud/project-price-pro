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
  return (
    <Card className="w-full max-w-2xl mx-auto p-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold mb-6 text-primary">{question}</h2>
      <RadioGroup
        value={selectedOption}
        onValueChange={onSelect}
        className="space-y-4"
      >
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-primary-100 transition-colors cursor-pointer"
            onClick={() => onSelect(option.id)}
          >
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-grow cursor-pointer">
              {option.label.toString()}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="mt-8 flex justify-end">
        <Button
          onClick={onNext}
          disabled={!selectedOption}
          className="px-8"
        >
          {isLastQuestion ? "Generate Estimate" : "Next"}
        </Button>
      </div>
    </Card>
  );
};