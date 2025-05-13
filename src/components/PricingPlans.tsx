import { s } from "node_modules/framer-motion/dist/types.d-DDSxwf0n";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PricingPlans = ({ formData, setFormData, selectPlan }) => {
  const navigate = useNavigate();
  const plans = [
    {
      key: "pioneer",
      title: "Pioneer",
      features: [
        "Up to 2 team members",
        "Unlimited leads",
        "Whitelabel custom app",
        "Capture client signature",
        "Personalized ai pricing & rules",
        "24/7 email support",
        "0.1-0.3 subtotal volume",
        "1000$ in cash credits"
      ],
      buttonText: "Select Plan",
    },
    {
      key: "enterprise",
      title: "Enterprise",
      features: [
        "Everything in PIONEER +",
        "Use your own domain",
        "Unlimited team members",
        "Unlimited API & Webhook access",
        "Custom integrations",
        "Personalized onboarding & marketing support",
        "24/7 priority support",
        "Unlimited usage"
      ],
      buttonText: "Contact Sales",
    }
  ];

  const handleSelectPlan = (planKey) => {
    setFormData({ ...formData, tier: planKey });
  };

  useEffect(() => {
      selectPlan();
  },[formData.tier]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
      {plans.map((plan) => (
        <div 
        key={plan.key}
        className={`flex flex-col rounded-lg p-4 md:p-8 border border-gray-200
          ${formData.tier === plan.key ? "ring-2 ring-blue-500" : ""}
          `}
      >
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg md:text-2xl font-bold">{plan.title}</h3>
        </div>

        <div className="min-w-[100%] border-b border-gray-200 mb-8"></div>
        
        <div className="flex-grow">
          <ul className="space-y-2 md:space-y-4 text-sm md:text-base">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-5 flex-shrink-0">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <button
          onClick={() => handleSelectPlan(plan.key)}
          className="mt-6 md:mt-8 w-full py-2 md:py-3 px-4 rounded-md text-center font-medium
            bg-white text-black border border-gray-300 
            hover:bg-primary hover:text-white hover:border-primary
            transition-colors duration-200"
        >
          {plan.buttonText}
        </button>
      </div>
      ))}
    </div>
  );
};

export default PricingPlans;