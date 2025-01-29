import { cn } from "@/lib/utils";

interface Step {
  label: string;
  value: number;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  const totalSteps = steps.length;
  
  return (
    <div className="w-full max-w-xs mx-auto mb-8">
      <div className="relative">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-100">
          <div
            style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
          />
        </div>
        <div className="flex justify-between">
          {steps.map((step) => (
            <div
              key={step.value}
              className={cn(
                "text-sm",
                currentStep >= step.value
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};