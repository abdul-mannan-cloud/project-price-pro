import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface EstimateProgressProps {
  stage: string;
  progress: number;
}

export const EstimateProgress = ({ stage, progress }: EstimateProgressProps) => {
  // Store the base progress for each stage
  const stageBaseProgress = {
    'photo': 0,
    'description': 20,
    'category': 40,
    'questions': 60,
    'contact': 80,
    'estimate': 100
  };

  // Store visual progress as state
  const [visualProgress, setVisualProgress] = useState(stageBaseProgress[stage as keyof typeof stageBaseProgress] || 0);

  // Store the last stage to detect changes
  const [lastStage, setLastStage] = useState(stage);

  // Calculate the next stage progress
  const getNextStageProgress = (currentStage: string): number => {
    const stageOrder = ['photo', 'description', 'category', 'questions', 'contact', 'estimate'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const nextIndex = currentIndex + 1;

    if (nextIndex < stageOrder.length) {
      const nextStage = stageOrder[nextIndex];
      return stageBaseProgress[nextStage as keyof typeof stageBaseProgress];
    }

    return 100;
  };

  // Update visual progress when either stage or progress changes
  useEffect(() => {
    // If stage changed, reset to base progress for that stage
    if (stage !== lastStage) {
      setLastStage(stage);
      setVisualProgress(stageBaseProgress[stage as keyof typeof stageBaseProgress] || 0);
      return;
    }

    // For the questions stage, we want to show incremental progress
    if (stage === 'questions' && typeof progress === 'number' && !isNaN(progress)) {
      // Determine the range for this stage
      const baseForStage = stageBaseProgress.questions;
      const nextStageProgress = getNextStageProgress('questions');
      const range = nextStageProgress - baseForStage;

      // Scale the progress within the stage's range
      // Using Math.sqrt for non-linear scaling (makes small changes more visible)
      const normalizedProgress = Math.min(1, Math.max(0, progress / 100));
      const scaledProgress = baseForStage + (range * Math.sqrt(normalizedProgress));

      // Animate the change
      setVisualProgress(prev => {
        // Don't go backwards unless it's a big change
        if (scaledProgress < prev && (prev - scaledProgress) < 5) {
          return prev;
        }
        // Don't jump too far ahead
        if (scaledProgress > prev) {
          return prev + Math.min(1, scaledProgress - prev);
        }
        return scaledProgress;
      });
    }
  }, [stage, progress, lastStage]);

  // Determine stage completion
  const stageOrder = ['photo', 'description', 'category', 'questions', 'contact', 'estimate'];
  const currentStageIndex = stageOrder.indexOf(stage);

  const isStageComplete = (stageName: string) => {
    const stageIndex = stageOrder.indexOf(stageName);
    return stageIndex < currentStageIndex;
  };

  const isStageActive = (stageName: string) => {
    return stageName === stage;
  };

  // Log values for debugging
  console.log(`Raw progress: ${progress}, Visual: ${visualProgress.toFixed(2)}, Stage: ${stage}`);

  return (
      <div className="w-full bg-gray-100 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-2">
          {/* Progress bar */}
          <div className="w-full h-4 bg-gray-200 relative rounded-full overflow-hidden">
            <div
                className="absolute h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, visualProgress))}%` }}
            />

            {/* Stage markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2">
              {stageOrder.map((stageName) => (
                  <div
                      key={stageName}
                      className={cn(
                          "w-3 h-3 rounded-full border-2 z-10 transform transition-all duration-300",
                          isStageComplete(stageName) || isStageActive(stageName)
                              ? "bg-primary border-white"
                              : "bg-gray-300 border-gray-100"
                      )}
                  />
              ))}
            </div>
          </div>

          {/* Stage labels */}
          <div className="flex justify-between text-xs mt-1 text-gray-500">
            <span className={cn(isStageComplete('photo') || isStageActive('photo') ? "text-primary font-medium" : "")}>Photo</span>
            <span className={cn(isStageComplete('description') || isStageActive('description') ? "text-primary font-medium" : "")}>Description</span>
            <span className={cn(isStageComplete('category') || isStageActive('category') ? "text-primary font-medium" : "")}>Category</span>
            <span className={cn(isStageComplete('questions') || isStageActive('questions') ? "text-primary font-medium" : "")}>Details</span>
            <span className={cn(isStageComplete('contact') || isStageActive('contact') ? "text-primary font-medium" : "")}>Contact</span>
            <span className={cn(isStageComplete('estimate') || isStageActive('estimate') ? "text-primary font-medium" : "")}>Estimate</span>
          </div>
        </div>
      </div>
  );
};