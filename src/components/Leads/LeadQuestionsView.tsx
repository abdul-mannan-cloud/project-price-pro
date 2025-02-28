import { Separator } from "@/components/ui/separator";
import { Mail, Phone } from "lucide-react";
import type { Lead } from "./LeadsTable";

interface LeadQuestionsViewProps {
  lead: Lead | null;
}

export const LeadQuestionsView = ({ lead }: LeadQuestionsViewProps) => {
  if (!lead) {
    return <div>No lead data available</div>;
  }

  const handleEmailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handlePhoneClick = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  console.log("LEad DAta",lead)

  return (
    <div className="space-y-8 ">
      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
        <div className="grid gap-4 bg-muted/30 p-6 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{lead?.user_name || "Not provided"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            {lead?.user_email ? (
              <button
                onClick={() => handleEmailClick(lead.user_email!)}
                className="font-medium text-primary hover:underline inline-flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {lead.user_email}
              </button>
            ) : (
              <p className="font-medium">Not provided</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            {lead?.user_phone ? (
              <button
                onClick={() => handlePhoneClick(lead.user_phone!)}
                className="font-medium text-primary hover:underline inline-flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {lead.user_phone}
              </button>
            ) : (
              <p className="font-medium">Not provided</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project Address</p>
            <p className="font-medium">{lead?.project_address || "Not provided"}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Project Details */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="space-y-4 bg-muted/30 p-6 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{lead?.project_title || "Not provided"}</p>
          </div>
          {lead?.project_description && (
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
        <p className="text-sm text-muted-foreground mb-6">
          Below is a detailed breakdown of the customer's responses to each question in the estimate form.
          Each category contains specific questions and their corresponding answers.
        </p>
        <div className="space-y-6">
          {lead?.answers && Object.entries(lead.answers).map(([category, answers]) => (
            <div key={category} className="space-y-4">
              <h4 className="font-medium text-primary text-lg">{category}</h4>
              <div className="space-y-6">
                {Object.values(answers).map((qa: any, index: number) => (
                  <div key={index} className="bg-muted/30 p-6 rounded-lg border border-border/50">
                    <p className="font-medium text-lg mb-4 text-foreground/90">{qa.question}</p>
                    <div className="space-y-3">
                      {qa.answers?.map((answer: string, i: number) => {
                        const option = qa.options?.find((opt: any) => opt.value === answer);
                        return (
                          <div key={i} className="flex items-start gap-3 bg-background/50 p-4 rounded-md border border-border/30">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <div className="space-y-2">
                              <p className="text-foreground font-medium">
                                {option?.label || answer}
                              </p>
                              {option?.description && (
                                <p className="text-sm text-muted-foreground">
                                  {option.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {index < Object.values(answers).length - 1 && (
                      <Separator className="my-6" />
                    )}
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