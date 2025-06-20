import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import { useNavigate } from "react-router-dom";

/* ── keep this in sync with Header1 real height ── */
const HEADER_HEIGHT = 80; // px

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors">
      <Header1 />

      {/* push everything below the fixed header */}
      <main
        className="flex-grow px-4 md:px-20 pb-10 max-w-6xl mx-auto"
        style={{ paddingTop: HEADER_HEIGHT }}
      >
        <button
          onClick={handleBack}
          className="relative z-10 text-primary dark:text-white hover:underline text-sm mb-6"
        >
          ← Back
        </button>

        <div className="text-base leading-relaxed">
          <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Last Updated: 3/14/2025
          </p>

          {/* === content unchanged below this line === */}
          {/* 1. Introduction */}
          <section>
            <h2 className="mt-8 text-lg font-semibold leading-none tracking-tight">
              1. Introduction
            </h2>
            <p>
              Welcome to <strong>Estimatrix</strong> ("we," "our," or "us"). We
              provide an AI-powered construction-estimate generator designed to
              connect customers with contractors. This Privacy Policy explains
              how we collect, use, and protect your personal data in compliance
              with the General Data Protection Regulation (GDPR) and other
              relevant privacy laws.
            </p>
            <p className="mt-2">
              By using Estimatrix, you consent to our collection and use of your
              personal information as described in this policy.
            </p>
          </section>

          {/* 2. Data We Collect */}
          <section>
            <h2 className="text-lg font-semibold leading-none tracking-tight my-4">
              2. Data We Collect
            </h2>
            <ul className="list-disc list-inside space-y-2 px-5 text-[15px] text-muted-foreground">
              <li>
                <strong>Identity &amp; Contact Information:</strong> Name,
                email, phone number.
              </li>
              <li>
                <strong>Project Details:</strong> Information users provide
                about their construction project.
              </li>
              <li>
                <strong>Payment Information:</strong> Credit/debit card details,
                billing address (processed securely).
              </li>
              <li>
                <strong>Technical Data:</strong> IP address, device information,
                browsing activity on our site.
              </li>
              <li>
                <strong>SMS Consent Data:</strong> If you opt in to receive text
                messages, we collect your mobile number and record your opt-in
                status, preferences, and related SMS communications. Your mobile
                number and SMS opt-in information will not be sold or shared
                with third parties.
              </li>
            </ul>
          </section>

          {/* 3. How We Use Your Data */}
          <section>
            <h2 className="text-lg font-semibold leading-none tracking-tight my-4">
              3. How We Use Your Data
            </h2>
            <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
              <li>Generating construction estimates using AI.</li>
              <li>
                Connecting users with contractors who can provide services.
              </li>
              <li>
                Sending service notifications and updates via SMS if opted in.
              </li>
              <li>
                Providing marketing and promotional offers (email or SMS, if
                consent is given).
              </li>
              <li>
                Analyzing website performance using tracking tools like Google
                Analytics.
              </li>
              <li>
                Processing payments securely through third-party payment
                providers.
              </li>
            </ul>
          </section>

          {/* 4–9. (unchanged) */}
          {/* … keep your remaining sections exactly as they were … */}
        </div>
      </main>

      <Footerdemo />
    </div>
  );
};

export default PrivacyPolicy;
