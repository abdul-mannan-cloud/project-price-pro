import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PricingPlansProps {
  formData: { tier: string | null };
  setFormData: React.Dispatch<React.SetStateAction<{ tier: string | null }>>;
  selectPlan: () => void;
  loading: boolean;
}

const PricingPlans = ({
  formData,
  setFormData,
  selectPlan,
  loading,
}: PricingPlansProps) => {
  const navigate = useNavigate();
  const [manualSelection, setManualSelection] = useState(false);

  const plans = [
    {
      key: "pioneer",
      title: "Pioneer",
      pricing: ".01 - .03",
      subtitle: "Subtotal Volume",
      label: "$1,000 Free Credit",
      features: [
        "Up to 2 team members",
        "Unlimited leads",
        "Whitelabel custom app",
        "Capture client signature",
        "Personalized ai pricing & rules",
        "24/7 email support",
      ],
      buttonText: "Select Plan",
    },
    {
      key: "enterprise",
      title: "Enterprise",
      pricing: "",
      subtitle: "Talk to Sales",
      label: "Unlimited",
      features: [
        "Everything in PIONEER +",
        "Use your own domain",
        "Unlimited team members",
        "Unlimited API & Webhook access",
        "Custom integrations",
        "Personalized onboarding & marketing support",
        "24/7 priority support",
      ],
      buttonText: "Schedule a call",
    },
  ];

  // Fire only on manual selection
  const handleSelectPlan = (planKey: string) => {
    setManualSelection(true);
    setFormData({ tier: planKey });
  };

  useEffect(() => {
    if (manualSelection) {
      selectPlan();
      // Navigate to signup page after plan selection
      navigate("/signup");
      setManualSelection(false);
    }
  }, [formData.tier, manualSelection, selectPlan, navigate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
      {plans.map((plan) => {
        const isCurrent = formData.tier === plan.key;
        return (
          <div
            key={plan.key}
            className={`
              flex flex-col rounded-lg p-4 md:p-8
              bg-[var(--card)] border border-[var(--border)]
              transition-shadow hover:shadow-lg
            `}
            style={{ color: "var(--card-foreground)" }}
          >
            {/* Header */}
            <div className="mb-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-2xl font-bold">{plan.title}</h3>
                <span
                  className="
                    inline-block rounded-full py-1 px-3 text-[10px] md:text-sm font-semibold
                    bg-white text-green-600 border border-green-200
                  "
                >
                  {plan.label}
                </span>
              </div>
              <div>
                <p className="text-[var(--foreground)] text-4xl font-bold">
                  {plan.pricing}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  {plan.subtitle}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b mb-8 border-[var(--border)]" />

            {/* Features */}
            <ul className="flex-grow space-y-3 md:space-y-4 text-sm md:text-base">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-3 mt-1 text-[var(--card-foreground)]">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleSelectPlan(plan.key)}
              disabled={loading}
              className={`
                mt-6 md:mt-8 w-full py-2 md:py-3 rounded-md font-semibold
                bg-white text-gray-900 border border-gray-300
                hover:bg-blue-600 hover:text-white hover:border-blue-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              {loading && isCurrent ? "Processing..." : plan.buttonText}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PricingPlans;
