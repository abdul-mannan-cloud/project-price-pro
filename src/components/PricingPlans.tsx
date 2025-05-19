import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PricingPlans = ({ formData, setFormData, selectPlan, loading }) => {
  const navigate = useNavigate();
  // Add the manual selection flag
  const [manualSelection, setManualSelection] = useState(false);
  
  const plans = [
    {
      key: "pioneer",
      title: "Pioneer",
      pricing: ".01 - .03",
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
    }
  ];

  // Update handleSelectPlan to set the manual selection flag
  const handleSelectPlan = (planKey) => {
    setManualSelection(true);
    setFormData({ ...formData, tier: planKey });
  };

  // Modify useEffect to only call selectPlan when manual selection is true
  useEffect(() => {
    if (manualSelection) {
      selectPlan();
      setManualSelection(false); // Reset the flag after calling selectPlan
    }
  }, [formData.tier, manualSelection, selectPlan]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
      {plans.map((plan) => (
        <div 
          key={plan.key}
          className={`flex flex-col rounded-lg p-4 md:p-8 border border-gray-200
              ${plan.key === "pioneer" ? "bg-white" : "bg-gray-100"}
            `}
        >
          <div className="mb-4 md:mb-6 flex flex-col gap-5">
            <div className="flex gap-3 items-center">
              <h3 className="text-lg md:text-2xl font-bold">{plan.title}</h3>
              <div className={`${plan.key === "pioneer" ? "bg-green-400 text-white" : "bg-white text-green-400"} rounded-full py-1 px-3 text-[10px] md:text-sm font-semibold`}>
                { plan.key === "pioneer" ?
                  <span>$1,000 Free Credit</span>
                  :                 
                  <span>Unlimited</span>
                }
              </div>
            </div>
            <div>
              <p className="text-black text-4xl font-bold">{plan.pricing}</p>
              {
                plan.key === "pioneer" ?
                <p>Subtotal Volume</p>
                :
                <p>Talk to Sales</p>
              }
            </div>
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
            disabled={loading}
            className={`mt-6 md:mt-8 w-full py-2 md:py-3 px-4 rounded-md text-center font-semibold 
              hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50
              transition-colors duration-200 ${plan.key === "pioneer" ? "bg-gray-100" : "bg-white"}`}
          >
            {loading && formData.tier == plan.key ? 'Processing...' : plan.buttonText}
          </button>
        </div>
      ))}
    </div>
  );
};

export default PricingPlans;