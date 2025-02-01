import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category, QuestionFlow } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { initializeQuestionFlow, updateQuestionFlow } from "@/utils/questionFlowManager";

interface QuestionManagerProps {
  questionSets: CategoryQuestions[];
  onComplete: (answers: Record<string, Record<string, string[]>>) => void;
  categories: Category[];
  currentCategory: string;
  onSelectAdditionalCategory: (categoryId: string) => void;
  completedCategories: string[];
}

export const QuestionManager = ({
  questionSets,
  onComplete,
  categories,
  currentCategory,
  onSelectAdditionalCategory,
  completedCategories,
}: QuestionManagerProps) => {
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [questionFlow, setQuestionFlow] = useState<QuestionFlow | null>(null);

  useEffect(() => {
    if (questionSets.length > 0) {
      setQuestionFlow(initializeQuestionFlow(questionSets));
      setIsLoadingQuestions(false);
    }
  }, [questionSets]);

  const handleAnswer = (questionId: string, selectedValues: string[]) => {
    if (!questionFlow) return;

    const currentBranch = questionFlow.branches[questionFlow.currentBranchIndex];
    if (!currentBranch) {
      onComplete(questionFlow.answers);
      return;
    }

    const currentQuestion = currentBranch.questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const updatedFlow = updateQuestionFlow(questionFlow, selectedValues);
    setQuestionFlow(updatedFlow);

    // Check if we've completed all branches
    if (updatedFlow.currentBranchIndex >= updatedFlow.branches.length) {
      onComplete(updatedFlow.answers);
    }
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (!questionFlow) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">
          No questions available. Moving to next category...
        </p>
      </div>
    );
  }

  const currentBranch = questionFlow.branches[questionFlow.currentBranchIndex];
  if (!currentBranch) {
    return null;
  }

  const currentQuestion = currentBranch.questions.find(
    q => q.id === currentBranch.currentQuestionId
  );
  if (!currentQuestion) {
    return null;
  }

  const currentAnswers = questionFlow.answers[currentBranch.category] || {};

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={currentAnswers[currentQuestion.id] || []}
      onSelect={(values) => handleAnswer(currentQuestion.id, values)}
      currentStage={questionFlow.currentBranchIndex + 1}
      totalStages={questionFlow.branches.length}
    />
  );
};

export default QuestionManager;