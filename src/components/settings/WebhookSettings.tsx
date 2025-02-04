import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export const WebhookSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookDescription, setNewWebhookDescription] = useState("");

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addWebhook = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhooks").insert({
        url: newWebhookUrl,
        description: newWebhookDescription,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setNewWebhookUrl("");
      setNewWebhookDescription("");
      toast({
        title: "Webhook added",
        description: "Your webhook has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add webhook. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({
        title: "Webhook deleted",
        description: "Your webhook has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete webhook. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    addWebhook.mutate();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            label="Webhook URL"
            placeholder="https://your-webhook-url.com"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Input
            label="Description"
            placeholder="Description (optional)"
            value={newWebhookDescription}
            onChange={(e) => setNewWebhookDescription(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!newWebhookUrl || addWebhook.isPending}>
          {addWebhook.isPending ? "Adding..." : "Add Webhook"}
        </Button>
      </form>

      <div className="space-y-4">
        {webhooks?.map((webhook) => (
          <div
            key={webhook.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="space-y-1">
              <p className="font-medium break-all">{webhook.url}</p>
              {webhook.description && (
                <p className="text-sm text-muted-foreground">{webhook.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteWebhook.mutate(webhook.id)}
              disabled={deleteWebhook.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};