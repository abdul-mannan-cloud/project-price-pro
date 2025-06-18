import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Mail, Clock } from "lucide-react";

export const TeammateSettings = () => {
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ["teammates"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("teammates")
        .select("*")
        .eq("contractor_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const addTeammate = useMutation({
    mutationFn: async (email: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      try {
        const { error } = await supabase.functions.invoke(
          "send-teammate-invitation",
          {
            body: {
              email,
              contractorId: user.id,
              businessName: currentUser?.business_name || "Our Company",
            },
          },
        );

        if (error) throw error;

        const { error: dbError } = await supabase.from("teammates").insert([
          {
            contractor_id: user.id,
            email,
            invitation_status: "pending",
            role: "member",
          },
        ]);

        if (dbError) {
          if (dbError.message.includes("Maximum of 2 teammates")) {
            throw new Error("You can only have up to 2 team members.");
          }
          throw dbError;
        }
      } catch (error: any) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
      setEmail("");
      toast({
        title: "Invitation sent",
        description: "An invitation email has been sent to join your team.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (teammateEmail: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      console.log("Resending invitation to:", teammateEmail);

      const { error } = await supabase.functions.invoke(
        "send-teammate-invitation",
        {
          body: {
            email: teammateEmail,
            contractorId: user.id,
            businessName: currentUser?.business_name || "Our Company",
          },
        },
      );

      if (error) throw error;

      // Update the invitation_sent_at timestamp
      const { error: updateError } = await supabase
        .from("teammates")
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq("email", teammateEmail)
        .eq("contractor_id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTeammate = useMutation({
    mutationFn: async (teammateId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("teammates")
        .delete()
        .eq("id", teammateId)
        .eq("contractor_id", user.id);

      if (error) throw error;

      // After successful deletion, immediately refetch the teammates list
      await queryClient.invalidateQueries({ queryKey: ["teammates"] });
    },
    onSuccess: () => {
      toast({
        title: "Teammate removed",
        description: "The teammate has been removed from your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      if (teammates.length >= 2) {
        toast({
          title: "Team limit reached",
          description: "You can only have up to 2 team members.",
          variant: "destructive",
        });
        return;
      }
      addTeammate.mutate(email);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
        />
        <Button
          type="submit"
          disabled={!email || addTeammate.isPending || teammates.length >= 2}
        >
          {addTeammate.isPending ? "Sending Invitation..." : "Add Teammate"}
        </Button>
      </form>

      <div className="space-y-2">
        {teammates.map((teammate) => (
          <div
            key={teammate.id}
            className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex items-center space-x-2">
              <span>{teammate.email}</span>
              {teammate.invitation_status === "pending" && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  Pending
                </div>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => resendInvitation.mutate(teammate.email)}
                disabled={resendInvitation.isPending}
                className="flex-1 sm:flex-none"
              >
                <Mail className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTeammate.mutate(teammate.id)}
                disabled={removeTeammate.isPending}
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {teammates.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No team members added yet
          </div>
        )}
        {teammates.length >= 2 && (
          <div className="text-sm text-muted-foreground mt-2">
            You've reached the maximum number of team members (2).
          </div>
        )}
      </div>
    </div>
  );
};

export default TeammateSettings;
