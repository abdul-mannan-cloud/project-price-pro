import * as React from "react";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import PricingPlans from "@/components/PricingPlans";

/* ─── keep this in sync with Header1 actual height ─── */
const HEADER_HEIGHT = 80; // px

export default function PricingPage() {
  const [formData, setFormData] = React.useState<{ tier: string | null }>({
    tier: null,
  });
  const [loading, setLoading] = React.useState(false);

  const handleSelectPlan = () => {
    setLoading(true);
    /* simulate async delay */
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] dark:bg-[#0B1E3C] text-[var(--foreground)] transition-colors">
      <Header1 />

      {/* push content below fixed header so nothing hides  */}
      <main
        className="flex-grow flex flex-col items-center justify-start px-4"
        style={{ paddingTop: HEADER_HEIGHT }}
      >
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
