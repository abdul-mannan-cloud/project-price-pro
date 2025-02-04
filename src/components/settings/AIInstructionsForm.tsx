import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Plus } from "lucide-react";
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

interface AIInstruction {
  title: string;
  description: string;
  instructions: string;
}

interface AIInstructionsFormProps {
  instructions: AIInstruction[];
  onSave: (instructions: AIInstruction[]) => void;
}

export const AIInstructionsForm = ({ instructions = [], onSave }: AIInstructionsFormProps) => {
  const [aiInstructions, setAiInstructions] = useState<AIInstruction[]>(instructions);
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [newInstruction, setNewInstruction] = useState<AIInstruction>({
    title: "",
    description: "",
    instructions: ""
  });

  const addInstruction = () => {
    setAiInstructions([...aiInstructions, newInstruction]);
    setIsAddingInstruction(false);
    setNewInstruction({
      title: "",
      description: "",
      instructions: ""
    });
  };

  const removeInstruction = (index: number) => {
    setAiInstructions(aiInstructions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(aiInstructions);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">AI Instructions</h3>
        </div>
        <Button
          onClick={() => setIsAddingInstruction(true)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Instruction
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Instructions</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aiInstructions.map((instruction, index) => (
            <TableRow key={index}>
              <TableCell>{instruction.title}</TableCell>
              <TableCell className="max-w-[200px] truncate">{instruction.description}</TableCell>
              <TableCell className="max-w-[200px] truncate">{instruction.instructions}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInstruction(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isAddingInstruction} onOpenChange={setIsAddingInstruction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Instruction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Title"
              value={newInstruction.title}
              onChange={(e) => setNewInstruction({ ...newInstruction, title: e.target.value })}
              placeholder="e.g., Material Cost Calculation"
            />
            <Input
              label="Description"
              value={newInstruction.description}
              onChange={(e) => setNewInstruction({ ...newInstruction, description: e.target.value })}
              placeholder="Brief description of the instruction"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Instructions</label>
              </div>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newInstruction.instructions}
                onChange={(e) => setNewInstruction({ ...newInstruction, instructions: e.target.value })}
                placeholder="Enter detailed instructions for AI..."
              />
            </div>
            <Button onClick={addInstruction} className="w-full">
              Add Instruction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {aiInstructions.length > 0 && (
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      )}
    </div>
  );
};