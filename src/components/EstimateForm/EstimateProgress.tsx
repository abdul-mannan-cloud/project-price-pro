
import { Progress } from "@/components/ui/progress";
import { EstimateStage } from "@/hooks/useEstimateFlow";

interface EstimateProgressProps {
  stage: EstimateStage;
  progress: number;
}

export const EstimateProgress = ({ stage, progress }: EstimateProgressProps) => {
  const getProgressValue = () => {
    const totalSteps = 5; // photo, description, category, questions, contact
    const baseProgress = {
      photo: 1,
      description: 2,
      category: 3,
      questions: 4,
      contact: 5,
      estimate: 5,
    }[stage];

    // Calculate progress percentage based on current stage and question progress
    if (stage === 'questions') {
      // Map the questions progress (0-100) to the range between category (60%) and contact (80%)
      const questionBaseProgress = 60; // Progress after category selection
      const questionMaxProgress = 80; // Progress before contact form
      return questionBaseProgress + ((progress / 100) * (questionMaxProgress - questionBaseProgress));
    }

    // Calculate base progress percentage for other stages
    const basePercentage = (baseProgress / totalSteps) * 100;

    switch (stage) {
      case 'photo':
        return 20;
      case 'description':
        return 40;
      case 'category':
        return 60;
      case 'contact':
        return 80;
      case 'estimate':
        return 100;
      default:
        return basePercentage;
    }
  };

  const showProgressBar = stage !== 'estimate' && stage !== 'contact';

  if (!showProgressBar) return null;

  return (
    <Progress 
      value={getProgressValue()} 
      className="h-8 rounded-none transition-all duration-500 ease-in-out"
    />
  );
};
