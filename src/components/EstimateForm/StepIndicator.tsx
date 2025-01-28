import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  steps?: Array<{
    label: string;
    value: number;
  }>;
}

export const StepIndicator = ({ currentStep, totalSteps, steps }: StepIndicatorProps) => {
  const stepsCount = totalSteps || (steps?.length || 3);
  
  return (
    <div className="w-full max-w-xs mx-auto mb-8">
      <div className="relative">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-100">
          <div
            style={{ width: `${(currentStep / (stepsCount - 1)) * 100}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
          />
        </div>
        <div className="flex justify-between">
          {steps ? (
            steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary-200 text-primary-700"
                    : "bg-primary-100 text-primary-400"
                )}
              >
                {index + 1}
              </div>
            ))
          ) : (
            Array.from({ length: stepsCount }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary-200 text-primary-700"
                    : "bg-primary-100 text-primary-400"
                )}
              >
                {index + 1}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};