import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare } from "lucide-react";

interface LeadViewToggleProps {
  view: "estimate" | "questions";
  onViewChange: (view: "estimate" | "questions") => void;
}

export const LeadViewToggle = ({ view, onViewChange }: LeadViewToggleProps) => {
  return (
    <div className="py-4">
      <Tabs 
        value={view} 
        onValueChange={(v) => onViewChange(v as "estimate" | "questions")}
        className="w-full flex justify-center"
      >
        <TabsList className="h-auto rounded-none border-b-2 border-border bg-transparent p-0 w-full flex max-w-[50%]">
          <TabsTrigger
            value="estimate"
            className="relative flex-col rounded-none px-4 py-2 flex-1 after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:text-primary"
          >
            <FileText 
              className="mb-1.5 h-4 w-4 group-data-[state=active]:text-primary transition-colors" 
              aria-hidden="true" 
              strokeWidth={view === "estimate" ? 2.5 : 1.5}
              color={view === "estimate" ? "var(--primary)" : "currentColor"}
              opacity={view === "estimate" ? 1 : 0.6}
            />
            Estimate
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="relative flex-col rounded-none px-4 py-2 flex-1 after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:text-primary"
          >
            <MessageSquare 
              className="mb-1.5 h-4 w-4 group-data-[state=active]:text-primary transition-colors" 
              aria-hidden="true" 
              strokeWidth={view === "questions" ? 2.5 : 1.5}
              color={view === "questions" ? "var(--primary)" : "currentColor"}
              opacity={view === "questions" ? 1 : 0.6}
            />
            Questions
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};