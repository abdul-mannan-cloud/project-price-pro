import { cn } from "@/lib/utils";

interface ProgressStepsProps {
  currentStep: number;
  steps: Array<{ label: string; value: number }>;
}

export const ProgressSteps = ({ currentStep, steps }: ProgressStepsProps) => {
  return (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {steps.map((step, index) => (
        <div
          key={step.value}
          className="flex items-center gap-2 justify-center align-middle"
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full transition-colors text-white flex items-center justify-center",
              currentStep >= step.value ? "bg-primary" : "bg-gray-300",
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              "font-medium",
              currentStep >= step.value ? "text-primary" : "text-gray-300",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-[2px] w-12",
                currentStep > step.value ? "bg-primary" : "bg-gray-300",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
