import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, DollarSign, Plus } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const UNIT_OPTIONS = [
  { value: "CF", label: "Cubic Feet (CF)" },
  { value: "CY", label: "Cubic Yards (CY)" },
  { value: "DY", label: "Day (DY)" },
  { value: "EA", label: "Each (EA)" },
  { value: "GAL", label: "Gallon (GAL)" },
  { value: "HR", label: "Hour (HR)" },
  { value: "IN", label: "Inch (IN)" },
  { value: "LBS", label: "Pounds (LBS)" },
  { value: "LF", label: "Linear Foot (LF)" },
  { value: "LS", label: "Lump Sum (LS)" },
  { value: "MO", label: "Month (MO)" },
  { value: "SF", label: "Square Foot (SF)" },
  { value: "SHT", label: "Sheet (SHT)" },
  { value: "SQ", label: "Square (SQ)" },
  { value: "SY", label: "Square Yards (SY)" },
  { value: "TONS", label: "Tons (TONS)" },
  { value: "WK", label: "Week (WK)" },
  { value: "WY", label: "Week (WY)" },
  { value: "YD", label: "Yard (YD)" },
];

export const AIRateForm = ({ rates = [], onSave }: AIRateFormProps) => {
  const [aiRates, setAiRates] = useState<AIRate[]>(rates);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [newRate, setNewRate] = useState<AIRate>({
    title: "",
    rate: "",
    unit: "",
    type: "hourly",
    instructions: ""
  });

  const addRate = () => {
    setAiRates([...aiRates, newRate]);
    setIsAddingRate(false);
    setNewRate({
      title: "",
      rate: "",
      unit: "",
      type: "hourly",
      instructions: ""
    });
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
          onClick={() => setIsAddingRate(true)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rate
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Instructions</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aiRates.map((rate, index) => (
            <TableRow key={index}>
              <TableCell>{rate.title}</TableCell>
              <TableCell>{rate.rate}</TableCell>
              <TableCell>{rate.unit}</TableCell>
              <TableCell>{rate.type}</TableCell>
              <TableCell className="max-w-[200px] truncate">{rate.instructions}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRate(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isAddingRate} onOpenChange={setIsAddingRate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Title"
              value={newRate.title}
              onChange={(e) => setNewRate({ ...newRate, title: e.target.value })}
              placeholder="e.g., Standard Labor Rate"
            />
            <Input
              label="Rate"
              type="number"
              value={newRate.rate}
              onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
              placeholder="e.g., 75"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Select
                value={newRate.unit}
                onValueChange={(value) => setNewRate({ ...newRate, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={newRate.type}
              onChange={(e) => setNewRate({ ...newRate, type: e.target.value })}
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
              <option value="square_foot">Square Foot</option>
            </select>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Instructions (Optional)</label>
              </div>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newRate.instructions}
                onChange={(e) => setNewRate({ ...newRate, instructions: e.target.value })}
                placeholder="Tell AI how to use this rate..."
              />
            </div>
            <Button onClick={addRate} className="w-full">
              Add Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {aiRates.length > 0 && (
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      )}
    </div>
  );
};