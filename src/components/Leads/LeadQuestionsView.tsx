import { Separator } from "@/components/ui/separator";
import type { Lead } from "./LeadsTable";

interface LeadQuestionsViewProps {
  lead: Lead;
}

export const LeadQuestionsView = ({ lead }: LeadQuestionsViewProps) => {
  return (
    <div className="space-y-8">
      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
        <div className="grid gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{lead.user_name || "Not provided"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{lead.user_email || "Not provided"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{lead.user_phone || "Not provided"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project Address</p>
            <p className="font-medium">{lead.project_address || "Not provided"}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Project Details */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{lead.project_title}</p>
          </div>
          {lead.project_description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{lead.project_description}</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Questions & Answers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Questions & Answers</h3>
        <div className="space-y-6">
          {lead.answers && lead.answers.answers && Object.entries(lead.answers.answers).map(([category, answers]) => (
            <div key={category} className="space-y-4">
              <h4 className="font-medium text-primary">{category}</h4>
              <div className="space-y-4">
                {Object.values(answers).map((qa: any, index: number) => (
                  <div key={index} className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-medium mb-2">{qa.question}</p>
                    <p className="text-sm text-muted-foreground">
                      {qa.options
                        ?.filter((opt: any) => qa.answers?.includes(opt.value))
                        .map((opt: any) => opt.label)
                        .join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};