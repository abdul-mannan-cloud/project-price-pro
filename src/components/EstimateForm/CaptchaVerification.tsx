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
        console.log("Using existing verification");
        setIsVerified(true);
        onVerify();
        return;
      } else {
        console.log("Stored verification expired, removing");
        localStorage.removeItem(VERIFICATION_KEY);
      }
    }
  }, [onVerify]);

  const handleVerify = (token: string) => {
    if (token) {
      console.log("New verification successful");
      setIsVerified(true);
      
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

  // Don't render Turnstile if already verified
  if (isVerified) {
    return null;
  }

  return (
    <div className="flex justify-center items-center min-h-[100px]">
      <Turnstile
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ""}
        onSuccess={handleVerify}
        onError={handleError}
        options={{
          theme: "light",
          appearance: "always",
          retry: "auto",
          refreshExpired: "auto"
        }}
      />
    </div>
  );
};