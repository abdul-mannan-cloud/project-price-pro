// src/pages/PricingPage.tsx
import * as React from "react";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import PricingPlans from "@/components/PricingPlans";

export default function PricingPage() {
  const [formData, setFormData] = React.useState<{ tier: string | null }>({
    tier: null,
  });
  const [loading, setLoading] = React.useState(false);

  const handleSelectPlan = (selectedTier: string) => {
    setLoading(true);
    setFormData({ tier: selectedTier });
    // simulate async action
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header1 />

      <main className="flex-grow flex flex-col items-center justify-start px-4 pt-16">
        <h1 className="text-[40px] font-semibold text-center text-[#1d1d1f] tracking-tight mb-8">
          Pricing Plans
        </h1>

        {/* Removed the extra bg-white panel wrapper here */}
        <div className="w-full max-w-3xl mb-12">
          <PricingPlans
            formData={formData}
            setFormData={setFormData}
            selectPlan={handleSelectPlan}
            loading={loading}
            // you can still pass any gap/container props if needed:
            className="gap-6"
            containerClassName="py-0"
          />
        </div>
      </main>

      <Footerdemo />
    </div>
  );
}
