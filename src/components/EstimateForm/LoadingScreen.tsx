import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fadeIn">
      <div className="text-center space-y-6 p-8 rounded-xl bg-white shadow-2xl">
        {/* Spinning Loader Icon */}
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        {/* Loading Message */}
        <p className="text-lg font-medium text-foreground">{message}</p>
        {/* Animated Dot Indicators */}
        <div className="flex justify-center space-x-2">
          <span className="dot bg-primary rounded-full w-3 h-3 inline-block"></span>
          <span className="dot bg-primary rounded-full w-3 h-3 inline-block"></span>
          <span className="dot bg-primary rounded-full w-3 h-3 inline-block"></span>
        </div>
      </div>
      {/* Inline styles for dot animation */}
      <style>{`
        @keyframes dotPulse {
          0% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.2; transform: scale(1); }
        }
        .dot {
          animation: dotPulse 1.5s infinite;
        }
        .dot:nth-child(1) {
          animation-delay: 0s;
        }
        .dot:nth-child(2) {
          animation-delay: 0.3s;
        }
        .dot:nth-child(3) {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
};
