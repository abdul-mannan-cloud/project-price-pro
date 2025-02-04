import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface FeaturesSectionWithHoverEffectsProps {
  setActiveDialog: (dialog: string | null) => void;
}

function Feature({ title, description, icon, onClick }: FeatureProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "relative w-full overflow-hidden rounded-lg border bg-background p-2",
        "hover:bg-accent hover:text-accent-foreground",
        "group flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="mb-2 mt-4 text-2xl">{icon}</div>
      <div className="space-y-2 text-center">
        <h3 className="font-semibold leading-none tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </Button>
  );
}

export function FeaturesSectionWithHoverEffects({ setActiveDialog }: FeaturesSectionWithHoverEffectsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Feature
        title="Business Information"
        description="Update your business details and contact information"
        icon="💼"
        onClick={() => setActiveDialog("business information")}
      />
      <Feature
        title="Service Categories"
        description="Choose which services you want to offer"
        icon="🔧"
        onClick={() => setActiveDialog("service categories")}
      />
      <Feature
        title="AI Preferences"
        description="Configure AI settings and rates"
        icon="🤖"
        onClick={() => setActiveDialog("ai preferences")}
      />
      <Feature
        title="Send Feedback"
        description="Share your thoughts and suggestions"
        icon="📝"
        onClick={() => setActiveDialog("feedback")}
      />
      <Feature
        title="FAQ"
        description="Frequently asked questions"
        icon="❓"
        onClick={() => setActiveDialog("faq")}
      />
    </div>
  );
}