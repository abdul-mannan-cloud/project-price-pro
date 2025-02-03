import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@marsidev/react-turnstile";
import { useToast } from "@/hooks/use-toast";

interface CaptchaVerificationProps {
  onVerified: () => void;
}

export const CaptchaVerification = ({ onVerified }: CaptchaVerificationProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const handleVerification = (token: string) => {
    if (token) {
      // Store verification in localStorage
      localStorage.setItem('estimator_verified', 'true');
      onVerified();
      toast({
        title: "Verification successful",
        description: "You can now proceed with your estimate",
      });
    }
  };

  return (
    <div className="card p-8 animate-fadeIn">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            🔒 Verify to Continue
          </h2>
          <p className="text-muted-foreground">
            Please complete the verification below to continue with your estimate
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-4">
        <Turnstile
          siteKey={siteKey}
          onSuccess={handleVerification}
          className="mx-auto"
          options={{
            theme: 'invisible'
          }}
        />
      </div>
    </div>
  );
};