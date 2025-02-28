import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, MessageSquare } from "lucide-react";

interface LeadViewToggleProps {
  view: "estimate" | "questions";
  onViewChange: (view: "estimate" | "questions") => void;
}

export const LeadViewToggle = ({ view, onViewChange }: LeadViewToggleProps) => {
  return (
    <div className="py-4">
      <ToggleGroup 
        type="single" 
        value={view} 
        onValueChange={(v) => onViewChange(v as "estimate" | "questions")}
        className="relative w-full max-w-[600px] mx-auto bg-muted p-1 rounded-xl"
      >
        <ToggleGroupItem 
          value="estimate" 
          className="flex-1 flex items-center justify-center gap-2 transition-all py-3 text-foreground hover:text-foreground/80"
        >
          <FileText className="h-4 w-4" />
          Estimate
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="questions" 
          className="flex-1 flex items-center justify-center gap-2 transition-all py-3 text-foreground hover:text-foreground/80"
        >
          <MessageSquare className="h-4 w-4" />
          Questions
        </ToggleGroupItem>

      </ToggleGroup>
    </div>
  );
};