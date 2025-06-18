import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface EstimateProgressProps {
  stage: string;
  progress: number;
}

export const EstimateProgress = ({
  stage,
  progress,
}: EstimateProgressProps) => {
  // Keep the original stage logic for compatibility
  const fullStageOrder = [
    "photo",
    "description",
    "category",
    "questions",
    "contact",
    "estimate",
  ];

  // Map original stages to visible stages for display
  const stageMapping: Record<string, string> = {
    photo: "description", // Photo maps to description
    description: "description",
    category: "description", // Category also maps to description
    questions: "questions",
    contact: "estimate", // Contact maps to estimate
    estimate: "estimate",
  };

  // Get the visual stage to display
  const visualStage = stageMapping[stage] || stage;

  // Define progress points for visual stages only
  const visualStageBaseProgress = {
    description: 0,
    questions: 50,
    estimate: 100,
  };

  // Visual stage order (simplified)
  const visualStageOrder = ["description", "questions", "estimate"];

  // Store visual progress as state
  const [visualProgress, setVisualProgress] = useState(0);

  // Calculate the percentage within the original stages
  const calculateVisualProgress = () => {
    const currentStageIndex = fullStageOrder.indexOf(stage);
    if (currentStageIndex === -1) return 0;

    const currentVisualStage = stageMapping[stage];
    const baseProgress =
      visualStageBaseProgress[
        currentVisualStage as keyof typeof visualStageBaseProgress
      ];

    // Find the next visual stage
    let nextVisualStage: string | null = null;
    let i = currentStageIndex + 1;

    while (i < fullStageOrder.length) {
      const nextMapping = stageMapping[fullStageOrder[i]];
      if (nextMapping !== currentVisualStage) {
        nextVisualStage = nextMapping;
        break;
      }
      i++;
    }

    const nextProgress = nextVisualStage
      ? visualStageBaseProgress[
          nextVisualStage as keyof typeof visualStageBaseProgress
        ]
      : 100;

    const range = nextProgress - baseProgress;

    // For stages that have substages (like description having photo, description, category)
    // we need to determine how far along we are in the substages
    const subStages = fullStageOrder.filter(
      (s) => stageMapping[s] === currentVisualStage,
    );
    const subStageIndex = subStages.indexOf(stage);
    const subStageCount = subStages.length;

    let subStageProgress = 0;
    if (subStageIndex !== -1 && subStageCount > 0) {
      // Calculate base progress for this substage
      subStageProgress = subStageIndex / (subStageCount - 1);

      // Add progress within the current stage if available
      if (
        stage === "questions" &&
        typeof progress === "number" &&
        !isNaN(progress)
      ) {
        // For questions stage we use the actual progress value
        const subStageRange = 1 / subStageCount;
        const normalizedProgress = Math.min(1, Math.max(0, progress / 100));
        subStageProgress =
          subStageIndex / subStageCount +
          subStageRange * Math.sqrt(normalizedProgress);
      }
    }

    // Calculate final visual progress
    return baseProgress + range * subStageProgress;
  };

  // Update visual progress when stage or progress changes
  useEffect(() => {
    const newProgress = calculateVisualProgress();

    // Animate the change
    setVisualProgress((prev) => {
      // Don't go backwards unless it's a big change
      if (newProgress < prev && prev - newProgress < 5) {
        return prev;
      }

      return newProgress;
    });
  }, [stage, progress]);

  // Determine stage completion for visual stages
  const isStageComplete = (visualStageName: string) => {
    const currentVisualStage = stageMapping[stage];
    const visualIndex = visualStageOrder.indexOf(visualStageName);
    const currentVisualIndex = visualStageOrder.indexOf(currentVisualStage);
    return visualIndex < currentVisualIndex;
  };

  const isStageActive = (visualStageName: string) => {
    return visualStageName === stageMapping[stage];
  };

  return (
    <div className="w-full bg-secondary border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-2">
        {/* Progress bar */}
        <div className="w-full h-4 bg-secondary relative rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, visualProgress))}%` }}
          />

          {/* Stage markers - only 3 now */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            {visualStageOrder.map((visualStageName) => (
              <div
                key={visualStageName}
                className={cn(
                  "w-3 h-3 rounded-full border-2 z-10 transform transition-all duration-300",
                  isStageComplete(visualStageName) ||
                    isStageActive(visualStageName)
                    ? "bg-primary border-white"
                    : "bg-gray-300 border-gray-100",
                )}
              />
            ))}
          </div>
        </div>

        {/* Stage labels - only 3 now */}
        <div className="flex justify-between text-xs mt-1 text-gray-500">
          <span
            className={cn(
              isStageComplete("description") || isStageActive("description")
                ? "text-primary font-medium"
                : "",
            )}
          >
            Description
          </span>
          <span
            className={cn(
              isStageComplete("questions") || isStageActive("questions")
                ? "text-primary font-medium"
                : "",
            )}
          >
            Details
          </span>
          <span
            className={cn(
              isStageComplete("estimate") || isStageActive("estimate")
                ? "text-primary font-medium"
                : "",
            )}
          >
            Estimate
          </span>
        </div>
      </div>
    </div>
  );
};
