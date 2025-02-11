
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

  console.log('QuestionManager state:', {
    currentQuestion,
    currentSet,
    isLoadingQuestions,
    isGeneratingEstimate,
    hasFollowUpQuestion,
    currentStage,
    totalStages,
    currentSetAnswers
  });

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (isGeneratingEstimate) {
    return <LoadingScreen message="Building your custom estimate..." isEstimate={true} />;
  }

  if (!currentQuestion) {
    return <LoadingScreen message="Loading questions..." />;
  }

  const isLastQuestion = currentStage === totalStages && !hasFollowUpQuestion;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedAnswers={currentSetAnswers[currentQuestion.id]?.answers || []}
      onSelect={handleAnswer}
      onNext={currentQuestion.type === 'multiple_choice' ? handleMultipleChoiceNext : undefined}
      isLastQuestion={isLastQuestion}
      currentStage={currentStage}
      totalStages={totalStages}
      hasFollowUpQuestion={hasFollowUpQuestion}
    />
  );
};

export default QuestionManager;
