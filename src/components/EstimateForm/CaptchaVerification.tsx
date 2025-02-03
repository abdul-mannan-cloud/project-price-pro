import { useState, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useToast } from "@/hooks/use-toast";

interface CaptchaVerificationProps {
  onVerify: () => void;
}

const VERIFICATION_KEY = 'estimate_verification_status';
const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const CaptchaVerification = ({ onVerify }: CaptchaVerificationProps) => {
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Check for existing verification on mount
  useEffect(() => {
    const storedVerification = localStorage.getItem(VERIFICATION_KEY);
    if (storedVerification) {
      const { timestamp } = JSON.parse(storedVerification);
      const isExpired = Date.now() - timestamp > VERIFICATION_EXPIRY;
      
      if (!isExpired) {
        console.log("Using existing verification from session");
        setIsVerified(true);
        onVerify();
        return;
      } else {
        console.log("Stored verification expired, requiring new verification");
        localStorage.removeItem(VERIFICATION_KEY);
      }
    }

    // Auto-trigger verification if no valid stored verification exists
    const timer = setTimeout(() => {
      if (!isVerified) {
        console.log("Auto-triggering Turnstile verification");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isVerified, onVerify]);

  const handleVerify = (token: string) => {
    if (token) {
      console.log("Verification successful", token);
      setIsVerified(true);
      
      // Store verification status with timestamp
      localStorage.setItem(VERIFICATION_KEY, JSON.stringify({
        verified: true,
        timestamp: Date.now()
      }));
      
      onVerify();
    }
  };

  const handleError = () => {
    console.error("Turnstile verification failed");
    toast({
      title: "Verification Failed",
      description: "Please refresh the page and try again.",
      variant: "destructive",
    });
  };

  return (
    <div className="absolute opacity-0 pointer-events-none">
      <Turnstile
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ""}
        onSuccess={handleVerify}
        onError={handleError}
        options={{
          theme: "light",
          size: "normal",
          appearance: "interaction-only",
          retry: "auto",
          refreshExpired: "auto"
        }}
      />
    </div>
  );
};