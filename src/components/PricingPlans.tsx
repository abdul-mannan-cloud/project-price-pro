import { useState } from "react";

const PricingPlans = ({ formData, setFormData }) => {
  const [modalPlan, setModalPlan] = useState<null | "pioneer" | "enterprise">(null);

  const openModal = (plan: "pioneer" | "enterprise") => setModalPlan(plan);
  const closeModal = () => setModalPlan(null);

  const handleSelectPlan = () => {
    if (modalPlan) {
      setFormData({ ...formData, tier: modalPlan });
      closeModal();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {["pioneer", "enterprise"].map((planKey) => {
          const isPioneer = planKey === "pioneer";
          const label = isPioneer ? "Pioneer Plan" : "Enterprise Plan";
          const isSelected = formData.tier === planKey;

          return (
            <div
              key={planKey}
              className={`flex justify-between items-center p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-2 border-primary bg-blue-50"
                  : "border border-gray-300 hover:border-gray-400"
              }`}
              onClick={() => openModal(planKey as "pioneer" | "enterprise")}
            >
              <span className="font-medium text-[#1d1d1f]">{label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering modal again
                  openModal(planKey as "pioneer" | "enterprise");
                }}
                className="text-blue-600 text-xl hover:text-blue-800"
              >
                ?
              </button>
            </div>
          );
        })}

      </div>

      {/* Modal */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg space-y-4 relative">
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl"
              onClick={closeModal}
            >
              ×
            </button>

            <h2 className="text-2xl font-semibold text-[#1d1d1f]">
              {modalPlan === "pioneer" ? "Pioneer Plan Details" : "Enterprise Plan Details"}
            </h2>

            <div className="text-sm text-[#4a4a4a] space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {modalPlan === "pioneer" ? (
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

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectPlan}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Select Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPlans;
