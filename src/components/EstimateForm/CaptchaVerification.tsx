import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileProps } from "@marsidev/react-turnstile";

interface CaptchaVerificationProps {
  onVerify: () => void;
}

export const CaptchaVerification = ({ onVerify }: CaptchaVerificationProps) => {
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = () => {
    setIsVerified(true);
    onVerify();
  };

  if (isVerified) {
    return null;
  }

  return (
    <Turnstile
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ""}
      onSuccess={handleVerify}
      options={{
        theme: "invisible" as const,
        size: "invisible",
        appearance: "always",
      }}
    />
  );
};