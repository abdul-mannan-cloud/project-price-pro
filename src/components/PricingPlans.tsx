import { useState } from "react";

const PricingPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState<null | "pioneer" | "enterprise">(null);

  const openModal = (plan: "pioneer" | "enterprise") => setSelectedPlan(plan);
  const closeModal = () => setSelectedPlan(null);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {["pioneer", "enterprise"].map((planKey) => {
          const isPioneer = planKey === "pioneer";
          const label = isPioneer ? "Pioneer Plan" : "Enterprise Plan";
          return (
            <div key={planKey} className="flex justify-between items-center p-4 border rounded-lg">
              <span className="font-medium text-[#1d1d1f]">{label}</span>
              <button
                onClick={() => openModal(planKey as "pioneer" | "enterprise")}
                className="text-blue-600 text-xl hover:text-blue-800"
              >
                ?
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg space-y-4 relative">
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl"
              onClick={closeModal}
            >
              ×
            </button>

            <h2 className="text-2xl font-semibold text-[#1d1d1f]">
              {selectedPlan === "pioneer" ? "Pioneer Plan Details" : "Enterprise Plan Details"}
            </h2>

            <div className="text-sm text-[#4a4a4a] space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {selectedPlan === "pioneer" ? (
                <>
                  <p>• Volume-based billing (.01 for estimates, .04 for signed estimates)</p>
                  <p>• Includes AI gas & SMS fees</p>
                  <p>• Monthly charges on the 1st</p>
                  <p>• 2 teammates allowed</p>
                  <p>• Signature always ON, no branded email/domain</p>
                  <p>• API and custom domain DISABLED</p>
                  <p>• Usage tab displays payment summary and methods</p>
                  <p>• Can book a Calendly call to upgrade</p>
                </>
              ) : (
                <>
                  <p>• Flexible limits, assumed no volume-based billing</p>
                  <p>• Likely includes API and custom branding</p>
                  <p>• Usage tab is hidden</p>
                  <p>• Must contact support or upgrade via Calendly from Pioneer plan</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPlans;
