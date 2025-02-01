import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

interface QuestionManagerProps {
  questionSets: CategoryQuestions[];
  onComplete: (answers: Record<string, Record<string, string[]>>) => void;
}

export const QuestionManager = ({
  questionSets,
  onComplete,
}: QuestionManagerProps) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Record<string, string[]>>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  const loadCurrentQuestionSet = () => {
    if (!questionSets[currentSetIndex]) {
      onComplete(answers);
      return;
    }

    try {
      const currentSet = questionSets[currentSetIndex];
      if (!currentSet?.questions?.length) {
        throw new Error('No questions available for this category');
      }

      const sortedQuestions = currentSet.questions.sort((a, b) => a.order - b.order);
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionId(sortedQuestions[0].id);
      setIsLoadingQuestions(false);
    } catch (error) {
      console.error('Error loading question set:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load questions",
        variant: "destructive",
      });
      moveToNextQuestionSet();
    }
  };

  const findNextQuestionId = (currentQuestion: Question, selectedValue: string): string | null => {
    const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValue);
    
    if (selectedOption?.next) {
      if (selectedOption.next === 'END') {
        return null;
      }
      if (selectedOption.next === 'NEXT_BRANCH') {
        moveToNextQuestionSet();
        return null;
      }
      return selectedOption.next;
    }

    if (currentQuestion.next === 'END') {
      return null;
    }
    if (currentQuestion.next === 'NEXT_BRANCH') {
      moveToNextQuestionSet();
      return null;
    }

    const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
    return currentIndex < questionSequence.length - 1 ? questionSequence[currentIndex + 1].id : null;
  };

  const moveToNextQuestionSet = () => {
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    
    setAnswers(prev => ({
      ...prev,
      [currentSet.category]: {
        ...prev[currentSet.category],
        [questionId]: selectedValues
      }
    }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestionId = findNextQuestionId(currentQuestion, selectedValues[0]);
      
      if (!nextQuestionId) {
        if (selectedValues[0] === 'no' && currentQuestion.type === 'yes_no') {
          moveToNextQuestionSet();
        } else {
          await handleComplete();
        }
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
  };

  const handleComplete = async () => {
    moveToNextQuestionSet();
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
  if (!currentQuestion) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">
          No questions available. Moving to next category...
        </p>
      </div>
    );
  }

  const currentSet = questionSets[currentSetIndex];
  const currentSetAnswers = answers[currentSet.category] || {};

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={currentSetAnswers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleComplete}
      isLastQuestion={currentSetIndex === questionSets.length - 1}
      currentStage={currentSetIndex + 1}
      totalStages={questionSets.length}
    />
  );
};

export default QuestionManager;