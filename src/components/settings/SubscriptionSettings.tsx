// import { PricingCard } from "@/components/ui/pricing-card";
// import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// export const SubscriptionSettings = () => {
//   const { toast } = useToast();

//   const handleUpgrade = () => {
//     toast({
//       title: "Coming Soon",
//       description: "Subscription upgrades will be available soon.",
//     });
//   };

//   return (
//     <div className="space-y-4">
//       <PricingCard
//         title="Service Plan"
//         description="Everything you need to grow your contracting business"
//         price={200}
//         features={[
//           {
//             title: "Core Features",
//             items: [
//               "Unlimited Leads",
//               "Unlimited Team Members",
//               "AI-Powered Estimates",
//               "Custom Branding",
//               "Lead Management",
//               "Team Collaboration",
//               "Service Categories",
//               "Webhook Integrations"
//             ],
//           },
//           {
//             title: "Premium Benefits",
//             items: [
//               "Priority Support",
//               "Early Feature Access",
//               "Advanced Analytics",
//               "Custom AI Instructions",
//               "Dedicated Account Manager",
//               "Training Sessions",
//               "API Access",
//               "White-label Options"
//             ],
//           },
//         ]}
//         buttonText="Upgrade Plan"
//         onButtonClick={handleUpgrade}
//       />
//     </div>
//   );
// };

export const SubscriptionSettings = ({contractor}) => {
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
      buttonText: "Get Started →",
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
      buttonText: "Contact Sales →",
    }
  ];

  const navigate = useNavigate();

  const handleOnClick = async (planKey) => {
    console.log("WORKING ON IT");
    
    if (planKey === "enterprise") {
      const { error: updateError } = await supabase
        .from("contractors")
        .update(
          { tier: planKey, verified: false }
        )
        .eq('id', contractor.id);

      if (updateError)  { 
        console.log("Update error:", updateError);
      } else {
        navigate("/verification");
      }
    } else {
      const { error: updateError } = await supabase
        .from("contractors")
        .update(
          { tier: planKey, verified: false }
        )
        .eq('id', contractor.id);

      if (updateError)  { 
        console.log("Update error:", updateError);
      }
    }
    console.log(`Selected plan: ${planKey}`);
  }
  

  return (
    <div  className="space-y-4">
      <h1>Subscriptions</h1>
      <div>
        <span><strong>Current Plan:</strong> {contractor?.tier?.charAt(0).toUpperCase() + contractor?.tier?.slice(1)}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
        {plans.map((plan) => (
          <div 
            key={plan.key}
            className={`flex flex-col rounded-lg p-4 md:p-8 border border-gray-200 ${
              contractor?.tier === plan.key ? "opacity-50" : "opacity-100"
            }`}
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
              onClick={() => handleOnClick(plan.key)}
              disabled={contractor?.tier === plan.key}
              className="mt-6 md:mt-8 w-full py-2 md:py-3 px-4 rounded-md text-center font-medium
                bg-white text-black border border-gray-300 
                hover:bg-primary hover:text-white hover:border-primary
                transition-colors duration-200 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-gray-300"
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
