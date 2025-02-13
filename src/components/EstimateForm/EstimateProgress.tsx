
import { Progress } from "@/components/ui/progress";
import { EstimateStage } from "@/hooks/useEstimateFlow";

interface EstimateProgressProps {
  stage: EstimateStage;
  progress: number;
}

export const EstimateProgress = ({ stage, progress }: EstimateProgressProps) => {
  const getProgressValue = () => {
    // Define base progress values for each stage
    const stageProgress = {
      photo: 25,        // Photo upload or skip = 25%
      description: 50,  // Description and question generation = 50%
      category: 50,     // Keep at 50% as we prepare for questions
      questions: 0,     // Will be calculated dynamically
      contact: 100,     // Contact form shows after estimate generation
      estimate: 100,    // Estimate complete
    };

    // For questions stage, calculate progress dynamically
    if (stage === 'questions') {
      // Start from 50% (after description) and progress to 100% (estimate generation)
      // Map the questions progress (0-100) to the range between 50% and 100%
      const questionStartProgress = 50;  // Start after description
      const questionEndProgress = 100;   // End at estimate generation
      const progressRange = questionEndProgress - questionStartProgress;
      
      return questionStartProgress + ((progress / 100) * progressRange);
    }

    // Return the base progress for other stages
    return stageProgress[stage] || 0;
  };

  const showProgressBar = stage !== 'estimate';

  if (!showProgressBar) return null;

  return (
    <Progress 
      value={getProgressValue()} 
      className="h-8 rounded-none transition-all duration-500 ease-in-out"
    />
  );
};
