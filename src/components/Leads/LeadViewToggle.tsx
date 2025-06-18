import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, History } from "lucide-react";
interface LeadViewToggleProps {
  view: "estimate" | "questions" | "history";
  onViewChange: (v: "estimate" | "questions" | "history") => void;
}

export const LeadViewToggle = ({ view, onViewChange }: LeadViewToggleProps) => {
  return (
    <div className="py-4">
      <Tabs
        value={view}
        onValueChange={(v) =>
          onViewChange(v as "estimate" | "questions" | "history")
        }
        className="w-full flex justify-center"
      >
        <TabsList className="h-auto rounded-none border-b-2 border-border bg-transparent p-0 w-full flex max-w-[70%]">
          {/* Estimate */}
          <TabsTrigger
            value="estimate"
            className="relative flex-1 flex-col px-4 py-2 after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] data-[state=active]:after:bg-primary"
          >
            <FileText className="mb-1.5 h-4 w-4" />
            Estimate
          </TabsTrigger>

          {/* Questions */}
          <TabsTrigger
            value="questions"
            className="relative flex-1 flex-col px-4 py-2 after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] data-[state=active]:after:bg-primary"
          >
            <MessageSquare className="mb-1.5 h-4 w-4" />
            Questions
          </TabsTrigger>

          {/* History */}
          <TabsTrigger
            value="history"
            className="relative flex-1 flex-col px-4 py-2 after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] data-[state=active]:after:bg-primary"
          >
            <History className="mb-1.5 h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
