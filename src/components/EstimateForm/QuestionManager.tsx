
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { CategoryQuestions, AnswersState } from "@/types/estimate";
import { useQuestionManager } from "@/hooks/useQuestionManager";

interface QuestionManagerProps {
  questionSets: CategoryQuestions[];
  onComplete: (answers: AnswersState) => void;
  onProgressChange: (progress: number) => void;
}

export const QuestionManager = ({
  questionSets,
  onComplete,
  onProgressChange,
}: QuestionManagerProps) => {
  const {
    currentQuestion,
    currentSet,
    currentSetAnswers,
    isLoadingQuestions,
    isGeneratingEstimate,
    hasFollowUpQuestion,
    currentStage,
    totalStages,
    handleAnswer,
    handleMultipleChoiceNext
  } = useQuestionManager(questionSets, onComplete, onProgressChange);

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (isGeneratingEstimate) {
    return <LoadingScreen message="Generating your estimate..." />;
  }

  if (!currentQuestion) {
    return <LoadingScreen message="Loading questions..." />;
  }

  return (
    <QuestionCard
      question={currentQuestion}
      selectedAnswers={currentSetAnswers[currentQuestion.id]?.answers || []}
      onSelect={handleAnswer}
      onNext={currentQuestion.type === 'multiple_choice' ? handleMultipleChoiceNext : undefined}
      isLastQuestion={currentStage === totalStages}
      currentStage={currentStage}
      totalStages={totalStages}
      hasFollowUpQuestion={hasFollowUpQuestion}
    />
  );
};

export default QuestionManager;
