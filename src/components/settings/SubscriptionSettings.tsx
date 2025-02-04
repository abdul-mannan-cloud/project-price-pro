import { PricingCard } from "@/components/ui/pricing-card";
import { useToast } from "@/hooks/use-toast";

export const SubscriptionSettings = () => {
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: "Coming Soon",
      description: "Subscription upgrades will be available soon.",
    });
  };

  return (
    <div className="space-y-4">
      <PricingCard
        title="Pro Plan"
        description="Everything you need to grow your contracting business"
        price={200}
        features={[
          {
            title: "Core Features",
            items: [
              "Unlimited Leads",
              "Unlimited Team Members",
              "AI-Powered Estimates",
              "Custom Branding",
              "Lead Management",
              "Team Collaboration",
              "Service Categories",
              "Webhook Integrations"
            ],
          },
          {
            title: "Premium Benefits",
            items: [
              "Priority Support",
              "Early Feature Access",
              "Advanced Analytics",
              "Custom AI Instructions",
              "Dedicated Account Manager",
              "Training Sessions",
              "API Access",
              "White-label Options"
            ],
          },
        ]}
        buttonText="Upgrade Plan"
        onButtonClick={handleUpgrade}
      />
    </div>
  );
};