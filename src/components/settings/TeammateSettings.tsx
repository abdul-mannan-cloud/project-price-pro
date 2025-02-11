import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export const TeammateSettings = () => {
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ["teammates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("teammates")
        .select("*")
        .eq("contractor_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const addTeammate = useMutation({
    mutationFn: async (email: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("teammates")
        .insert([{ contractor_id: user.id, email }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
      setEmail("");
      toast({
        title: "Teammate added",
        description: "An invitation has been sent to their email.",
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
      const { error } = await supabase
        .from("teammates")
        .delete()
        .eq("id", teammateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
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
        <Button type="submit" disabled={!email || addTeammate.isPending}>
          {addTeammate.isPending ? "Adding..." : "Add Teammate"}
        </Button>
      </form>

      <div className="space-y-2">
        {teammates.map((teammate) => (
          <div
            key={teammate.id}
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <span>{teammate.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeTeammate.mutate(teammate.id)}
              disabled={removeTeammate.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};