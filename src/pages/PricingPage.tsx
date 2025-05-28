import * as React from "react";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import PricingPlans from "@/components/PricingPlans";

export default function PricingPage() {
  const [formData, setFormData] = React.useState<{ tier: string | null }>({
    tier: null,
  });
  const [loading, setLoading] = React.useState(false);

  const handleSelectPlan = () => {
    setLoading(true);
    // simulate async action delay
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header1 />

      <main className="flex-grow flex flex-col items-center justify-start px-4 pt-16">
        <h1 className="mb-8 text-[40px] font-semibold text-center">
          Pricing Plans
        </h1>

        <div className="w-full max-w-3xl mb-12">
          <PricingPlans
            formData={formData}
            setFormData={setFormData}
            selectPlan={handleSelectPlan}
            loading={loading}
          />
        </div>
      </main>

      <Footerdemo />
    </div>
  );
}
