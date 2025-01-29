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
          className="flex items-center"
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              currentStep >= step.value
                ? "bg-primary"
                : "bg-muted"
            )}
          />
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-[2px] w-12",
                currentStep > step.value
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};