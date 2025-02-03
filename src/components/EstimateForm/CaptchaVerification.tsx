import { useState, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileProps } from "@marsidev/react-turnstile";
import { useToast } from "@/hooks/use-toast";

interface CaptchaVerificationProps {
  onVerify: () => void;
}

export const CaptchaVerification = ({ onVerify }: CaptchaVerificationProps) => {
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

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

  if (isVerified) {
    return null;
  }

  return (
    <Turnstile
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ""}
      onSuccess={handleVerify}
      onError={handleError}
      options={{
        theme: "invisible" as TurnstileProps["options"]["theme"],
        size: "invisible",
        appearance: "always",
        retry: "auto",
      }}
    />
  );
};