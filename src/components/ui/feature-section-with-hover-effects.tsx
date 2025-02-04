import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects({
  setActiveDialog,
}: {
  setActiveDialog: (dialog: string | null) => void;
}) {
  const features = [
    {
      title: "Preview Estimator",
      description: "Test and preview how your estimator looks to customers.",
      icon: <IconTerminal2 className="w-6 h-6" />,
    },
    {
      title: "Recent Activity",
      description: "Track your latest leads and customer interactions.",
      icon: <IconEaseInOut className="w-6 h-6" />,
    },
    {
      title: "Total Leads",
      description: "Monitor your lead generation and conversion metrics.",
      icon: <IconCurrencyDollar className="w-6 h-6" />,
    },
    {
      title: "Business Information",
      description: "Manage your company details and branding settings.",
      icon: <IconCloud className="w-6 h-6" />,
    },
    {
      title: "Service Categories",
      description: "Customize the services you offer to your customers.",
      icon: <IconRouteAltLeft className="w-6 h-6" />,
    },
    {
      title: "AI Preferences",
      description: "Configure AI settings for estimate generation.",
      icon: <IconHelp className="w-6 h-6" />,
    },
    {
      title: "Webhooks",
      description: "Set up integrations with your existing tools.",
      icon: <IconAdjustmentsBolt className="w-6 h-6" />,
    },
    {
      title: "Support",
      description: "Get help and access documentation when needed.",
      icon: <IconHeart className="w-6 h-6" />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} onClick={() => setActiveDialog(feature.title.toLowerCase())} />
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
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800 cursor-pointer",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
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
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
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