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
        className="relative w-full max-w-[400px] mx-auto bg-muted p-1 rounded-lg"
      >
        <ToggleGroupItem 
          value="estimate" 
          className="flex-1 flex items-center justify-center gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all rounded-md py-2"
        >
          <FileText className="h-4 w-4" />
          Estimate
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="questions" 
          className="flex-1 flex items-center justify-center gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all rounded-md py-2"
        >
          <MessageSquare className="h-4 w-4" />
          Questions
        </ToggleGroupItem>
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300"
          style={{
            width: "50%",
            transform: `translateX(${view === "estimate" ? "0%" : "100%"})`
          }}
        />
      </ToggleGroup>
    </div>
  );
};