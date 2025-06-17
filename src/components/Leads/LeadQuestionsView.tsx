import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Edit, Save, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Lead } from "./LeadsTable";

interface LeadQuestionsViewProps {
  lead: Lead | null;
  refetchLead?: () => void;
}

export const LeadQuestionsView = ({ lead, refetchLead }: LeadQuestionsViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    user_name: lead?.user_name || "",
    user_email: lead?.user_email || "",
    user_phone: lead?.user_phone || "",
    project_address: lead?.project_address || "",
    project_title: lead?.project_title || ""
  });
  const queryClient = useQueryClient();

  if (!lead) {
    return <div>No lead data available</div>;
  }

  const handleEmailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handlePhoneClick = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!lead?.id) return;
    
    setIsSaving(true);
    
    try {
      // Update lead in database
      const { data, error } = await supabase
        .from('leads')
        .update({
          user_name: editedData.user_name,
          user_email: editedData.user_email,
          user_phone: editedData.user_phone,
          project_address: editedData.project_address,
          project_title: editedData.project_title
        })
        .eq('id', lead.id);
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
     queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Refetch lead data if callback provided
      if (refetchLead) {
        refetchLead();
      }
      
      // Show success toast
      toast({
        title: "Success",
        description: "Customer information updated successfully.",
      });
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update customer information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setEditedData({
      user_name: lead.user_name || "",
      user_email: lead.user_email || "",
      user_phone: lead.user_phone || "",
      project_address: lead.project_address || "",
      project_title: lead.project_title || ""
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      {/* Customer Information */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Customer Information</h3>
          {isEditing ? (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit Information
            </Button>
          )}
        </div>
        
        <div className="grid gap-4 bg-muted/30 p-6 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            {isEditing ? (
              <Input
                name="user_name"
                value={editedData.user_name}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter customer name"
              />
            ) : (
              <p className="font-medium">{lead?.user_name || "Not provided"}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            {isEditing ? (
              <Input
                type="email"
                name="user_email"
                value={editedData.user_email}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter email address"
              />
            ) : (
              lead?.user_email ? (
                <button
                  onClick={() => handleEmailClick(lead.user_email!)}
                  className="font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {lead.user_email}
                </button>
              ) : (
                <p className="font-medium">Not provided</p>
              )
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            {isEditing ? (
              <Input
                type="tel"
                name="user_phone"
                value={editedData.user_phone}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter phone number"
              />
            ) : (
              lead?.user_phone ? (
                <button
                  onClick={() => handlePhoneClick(lead.user_phone!)}
                  className="font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {lead.user_phone}
                </button>
              ) : (
                <p className="font-medium">Not provided</p>
              )
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project Address</p>
            {isEditing ? (
              <Input
                name="project_address"
                value={editedData.project_address}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter project address"
              />
            ) : (
              <p className="font-medium">{lead?.project_address || "Not provided"}</p>
            )}
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
            {isEditing ? (
              <Input
                name="project_title"
                value={editedData.project_title}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter project title"
              />
            ) : (
              <p className="font-medium">{lead?.project_title || "Not provided"}</p>
            )}
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