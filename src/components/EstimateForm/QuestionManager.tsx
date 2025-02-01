import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

interface QuestionManagerProps {
  categoryData: CategoryQuestions;
  onComplete: (answers: Record<string, string[]>) => void;
  currentCategory: string;
  categories?: Category[];
  onSelectAdditionalCategory?: (categoryId: string) => void;
  completedCategories?: string[];
}

export const QuestionManager = ({
  categoryData,
  onComplete,
  currentCategory,
  categories,
  onSelectAdditionalCategory,
  completedCategories = [],
}: QuestionManagerProps) => {
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        if (!categoryData?.questions?.length) {
          throw new Error('No questions available');
        }

        const sortedQuestions = categoryData.questions
          .sort((a, b) => a.order - b.order);

        setQuestionSequence(sortedQuestions);
        setCurrentQuestionId(sortedQuestions[0].id);
        setAnswers({});
      } catch (error) {
        console.error('Error loading questions:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load questions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    if (categoryData) {
      loadQuestions();
    }
  }, [categoryData]);

  const findNextQuestionId = (currentQuestion: Question, selectedValue: string): string | null => {
    // First check if the selected option has a next question specified
    const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValue);
    if (selectedOption?.next) {
      if (selectedOption.next === 'END') return null;
      if (selectedOption.next === 'NEXT_BRANCH') {
        // Find the next branch's first question
        const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
        const nextBranchQuestion = questionSequence
          .slice(currentIndex + 1)
          .find(q => !q.id.includes('-'));
        return nextBranchQuestion?.id || null;
      }
      return selectedOption.next;
    }

    // If the current question has a next property, use that
    if (currentQuestion.next) {
      return currentQuestion.next === 'END' ? null : currentQuestion.next;
    }

    // If no specific navigation is defined, move to the next question in order
    const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
    return currentIndex < questionSequence.length - 1 ? questionSequence[currentIndex + 1].id : null;
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    setAnswers(prev => ({ ...prev, [questionId]: selectedValues }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestionId = findNextQuestionId(currentQuestion, selectedValues[0]);
      
      if (!nextQuestionId) {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
  };

  const handleComplete = async () => {
    if (Object.keys(answers).length === 0) {
      toast({
        title: "Error",
        description: "Please answer at least one question before continuing.",
        variant: "destructive",
      });
      return;
    }

    onComplete(answers);
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);

  if (!currentQuestion) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">
          No questions available. Please try selecting a different category.
        </p>
      </div>
    );
  }

  const isLastQuestion = !findNextQuestionId(currentQuestion, currentQuestion.options[0].value);

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleComplete}
      isLastQuestion={isLastQuestion}
      currentStage={currentQuestion.order}
      totalStages={questionSequence.length}
    />
  );
};

export default QuestionManager;