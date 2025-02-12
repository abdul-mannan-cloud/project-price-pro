
import { Progress } from "@/components/ui/progress";
import { EstimateStage } from "@/hooks/useEstimateFlow";

interface EstimateProgressProps {
  stage: EstimateStage;
  progress: number;
}

export const EstimateProgress = ({ stage, progress }: EstimateProgressProps) => {
  const getProgressValue = () => {
    switch (stage) {
      case 'photo':
        return 15;
      case 'description':
        return 30;
      case 'category':
        return 45;
      case 'questions':
        return progress;
      case 'contact':
        return 90;
      case 'estimate':
        return 100;
      default:
        return 0;
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
