import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, AnswersState, QuestionAnswer } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

interface QuestionManagerProps {
  questionSets: CategoryQuestions[];
  onComplete: (answers: AnswersState) => void;
}

export const QuestionManager = ({
  questionSets,
  onComplete,
}: QuestionManagerProps) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [queuedNextQuestions, setQueuedNextQuestions] = useState<string[]>([]);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  const loadCurrentQuestionSet = async () => {
    if (!questionSets[currentSetIndex]) {
      handleComplete();
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

  const findNextQuestionId = (
    currentQuestion: Question,
    selectedValue: string
  ): string | null | 'NEXT_BRANCH' => {
    const selectedOption = currentQuestion.options.find(
      (opt) => opt.value.toLowerCase() === selectedValue.toLowerCase()
    );
    
    if (selectedOption?.next) {
      if (selectedOption.next === 'NEXT_BRANCH') return 'NEXT_BRANCH';
      if (selectedOption.next === 'END') return null;
      return selectedOption.next;
    }

    if (currentQuestion.next === 'NEXT_BRANCH') return 'NEXT_BRANCH';
    if (currentQuestion.next === 'END' || !currentQuestion.next) return null;

    const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
    return currentIndex < questionSequence.length - 1
      ? questionSequence[currentIndex + 1].id
      : null;
  };

  const handleMultipleChoiceNext = async () => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValues = currentSetAnswers[currentQuestion.id]?.answers || [];
    if (selectedValues.length === 0) return;

    let nextIDs: string[] = [];
    for (const option of currentQuestion.options) {
      if (selectedValues.includes(option.value)) {
        if (option.next && option.next !== 'END') {
          nextIDs.push(option.next);
        }
      }
    }

    nextIDs = nextIDs.filter((item, index) => nextIDs.indexOf(item) === index);
    const validNextIDs = nextIDs.filter(id => id !== 'NEXT_BRANCH');
    
    if (validNextIDs.length > 0) {
      nextIDs = validNextIDs;
    }

    if (nextIDs.length > 0) {
      setCurrentQuestionId(nextIDs[0]);
      if (nextIDs.length > 1) {
        setQueuedNextQuestions(nextIDs.slice(1));
      }
    } else {
      moveToNextQuestionSet();
    }
  };

  const moveToNextQuestionSet = () => {
    setQueuedNextQuestions([]); // Clear queued questions when moving to next set
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
      setIsLoadingQuestions(true);
    } else {
      handleComplete();
    }
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    
    const questionAnswer: QuestionAnswer = {
      question: currentQuestion.question,
      type: currentQuestion.type,
      answers: selectedValues,
      options: currentQuestion.options
        .filter(opt => selectedValues.includes(opt.value))
        .map(opt => ({
          label: opt.label,
          value: opt.value,
          next: opt.next
        }))
    };
    
    setAnswers(prev => ({
      ...prev,
      [currentSet.category]: {
        ...prev[currentSet.category],
        [questionId]: questionAnswer
      }
    }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestionId = findNextQuestionId(currentQuestion, selectedValues[0]);
      
      if (nextQuestionId === 'NEXT_BRANCH') {
        if (queuedNextQuestions.length > 0) {
          setCurrentQuestionId(queuedNextQuestions[0]);
          setQueuedNextQuestions(prev => prev.slice(1));
        } else {
          moveToNextQuestionSet();
        }
      } else if (!nextQuestionId) {
        handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
  };

  const handleComplete = async () => {
    setIsGeneratingEstimate(true);
    try {
      onComplete(answers);
    } catch (error) {
      console.error('Error completing questions:', error);
      toast({
        title: "Error",
        description: "Failed to process your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEstimate(false);
    }
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (isGeneratingEstimate) {
    return <LoadingScreen message="Generating your estimate..." />;
  }

  const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
  if (!currentQuestion) {
    return <LoadingScreen message="Loading questions..." />;
  }

  const currentSet = questionSets[currentSetIndex];
  const currentSetAnswers = answers[currentSet.category] || {};
  const hasFollowUpQuestion = currentSetIndex < questionSets.length - 1 || 
    queuedNextQuestions.length > 0 || 
    (currentQuestion.type === 'multiple_choice' && currentQuestion.options.some(opt => opt.next));

  return (
    <QuestionCard
      question={currentQuestion}
      selectedAnswers={currentSetAnswers[currentQuestion.id]?.answers || []}
      onSelect={handleAnswer}
      onNext={currentQuestion.type === 'multiple_choice' ? handleMultipleChoiceNext : undefined}
      isLastQuestion={!hasFollowUpQuestion}
      currentStage={currentSetIndex + 1}
      totalStages={questionSets.length}
      hasFollowUpQuestion={hasFollowUpQuestion}
    />
  );
};

export default QuestionManager;