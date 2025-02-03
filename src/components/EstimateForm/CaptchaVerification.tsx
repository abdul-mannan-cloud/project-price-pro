import { useState, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useToast } from "@/hooks/use-toast";

interface CaptchaVerificationProps {
  onVerify: () => void;
}

export const CaptchaVerification = ({ onVerify }: CaptchaVerificationProps) => {
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Auto-trigger verification after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isVerified) {
        console.log("Auto-triggering Turnstile verification");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isVerified]);

  const handleVerify = (token: string) => {
    if (token) {
      console.log("Verification successful", token);
      setIsVerified(true);
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