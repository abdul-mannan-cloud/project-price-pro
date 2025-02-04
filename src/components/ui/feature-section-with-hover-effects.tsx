import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  CreditCard,
  Palette,
  Calculator,
  Bot,
  Grid,
  Webhook,
  MessageSquare,
  HelpCircle,
  LogOut,
} from "lucide-react";

interface FeaturesSectionProps {
  setActiveDialog: (dialog: string | null) => void;
}

export function FeaturesSectionWithHoverEffects({ setActiveDialog }: FeaturesSectionProps) {
  const features = [
    {
      title: "Business Information",
      description: "Manage your business details and contact information",
      icon: <Building2 className="h-6 w-6" />,
      onClick: () => setActiveDialog("business"),
    },
    {
      title: "Team Members",
      description: "Manage your team members and their access",
      icon: <Users className="h-6 w-6" />,
      onClick: () => setActiveDialog("team"),
    },
    {
      title: "Subscription",
      description: "Manage your subscription and billing",
      icon: <CreditCard className="h-6 w-6" />,
      onClick: () => setActiveDialog("subscription"),
    },
    {
      title: "Branding",
      description: "Customize your brand colors and appearance",
      icon: <Palette className="h-6 w-6" />,
      onClick: () => setActiveDialog("branding"),
    },
    {
      title: "Estimate Settings",
      description: "Configure your pricing and cost calculations",
      icon: <Calculator className="h-6 w-6" />,
      onClick: () => setActiveDialog("estimate"),
    },
    {
      title: "AI Preferences",
      description: "Configure how AI generates estimates and manages rates",
      icon: <Bot className="h-6 w-6" />,
      onClick: () => setActiveDialog("ai"),
    },
    {
      title: "Service Categories",
      description: "Select which services you offer and customize your estimate workflow",
      icon: <Grid className="h-6 w-6" />,
      onClick: () => setActiveDialog("categories"),
    },
    {
      title: "Webhooks",
      description: "Configure external integrations and automation",
      icon: <Webhook className="h-6 w-6" />,
      onClick: () => setActiveDialog("webhooks"),
    },
    {
      title: "Feedback",
      description: "Share your thoughts and suggestions with us",
      icon: <MessageSquare className="h-6 w-6" />,
      onClick: () => setActiveDialog("feedback"),
    },
    {
      title: "FAQ",
      description: "Find answers to common questions",
      icon: <HelpCircle className="h-6 w-6" />,
      onClick: () => setActiveDialog("faq"),
    },
    {
      title: "Log Out",
      description: "Sign out of your account",
      icon: <LogOut className="h-6 w-6" />,
      onClick: () => setActiveDialog("logout"),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800 cursor-pointer",
        (index === 0 || index === 4 || index === 8) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};