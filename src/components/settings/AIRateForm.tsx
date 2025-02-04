import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, DollarSign, Settings } from "lucide-react";
import { useState } from "react";

interface AIRate {
  title: string;
  rate: string;
  unit: string;
  type: string;
  instructions?: string;
}

interface AIRateFormProps {
  rates: AIRate[];
  onSave: (rates: AIRate[]) => void;
}

export const AIRateForm = ({ rates = [], onSave }: AIRateFormProps) => {
  const [aiRates, setAiRates] = useState<AIRate[]>(rates);

  const addRate = () => {
    setAiRates([...aiRates, {
      title: "",
      rate: "",
      unit: "",
      type: "hourly",
      instructions: ""
    }]);
  };

  const updateRate = (index: number, field: keyof AIRate, value: string) => {
    const updatedRates = [...aiRates];
    updatedRates[index] = { ...updatedRates[index], [field]: value };
    setAiRates(updatedRates);
  };

  const removeRate = (index: number) => {
    setAiRates(aiRates.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(aiRates);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">AI Rates</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addRate}
        >
          Add Rate
        </Button>
      </div>

      <div className="space-y-4">
        {aiRates.map((rate, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rate Configuration {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRate(index)}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Title"
                value={rate.title}
                onChange={(e) => updateRate(index, "title", e.target.value)}
                placeholder="e.g., Standard Labor Rate"
              />
              <Input
                label="Rate"
                type="number"
                value={rate.rate}
                onChange={(e) => updateRate(index, "rate", e.target.value)}
                placeholder="e.g., 75"
              />
              <Input
                label="Unit"
                value={rate.unit}
                onChange={(e) => updateRate(index, "unit", e.target.value)}
                placeholder="e.g., HR, SF"
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={rate.type}
                onChange={(e) => updateRate(index, "type", e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed</option>
                <option value="square_foot">Square Foot</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Instructions (Optional)</label>
              </div>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={rate.instructions}
                onChange={(e) => updateRate(index, "instructions", e.target.value)}
                placeholder="Tell AI how to use this rate..."
              />
            </div>
          </div>
        ))}
      </div>

      {aiRates.length > 0 && (
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      )}
    </div>
  );
};