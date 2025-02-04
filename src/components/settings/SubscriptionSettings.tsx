import { Button } from "@/components/ui/button";

export const SubscriptionSettings = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-background rounded-lg border">
        <h3 className="font-medium mb-2">Current Plan</h3>
        <p className="text-muted-foreground mb-4">Free Trial</p>
        <Button>Upgrade Plan</Button>
      </div>
    </div>
  );
};