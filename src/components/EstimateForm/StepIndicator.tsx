interface Step {
  label: string;
  value: number;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step) => (
        <div
          key={step.value}
          className={`flex flex-col items-center ${
            currentStep >= step.value ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= step.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            {step.value + 1}
          </div>
          <span className="text-sm">{step.label}</span>
        </div>
      ))}
    </div>
  );
};