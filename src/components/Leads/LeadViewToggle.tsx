import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, MessageSquare } from "lucide-react";

interface LeadViewToggleProps {
  view: "estimate" | "questions";
  onViewChange: (view: "estimate" | "questions") => void;
}

export const LeadViewToggle = ({ view, onViewChange }: LeadViewToggleProps) => {
  return (
    <div className="border-b bg-background p-4 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto">
        <ToggleGroup type="single" value={view} onValueChange={(v) => onViewChange(v as "estimate" | "questions")}>
          <ToggleGroupItem value="estimate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Estimate
          </ToggleGroupItem>
          <ToggleGroupItem value="questions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};