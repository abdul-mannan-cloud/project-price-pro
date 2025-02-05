import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, AnswersState, QuestionAnswer } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [branchingQueue, setBranchingQueue] = useState<string[]>([]);

  useEffect(() => {
    console.log("Loading question set for index:", currentSetIndex);
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  const loadCurrentQuestionSet = async () => {
    if (!questionSets[currentSetIndex]) {
      console.log("No more question sets, completing...");
      handleComplete();
      return;
    }

    try {
      const currentSet = questionSets[currentSetIndex];
      console.log("Current set:", currentSet);

      if (!currentSet?.questions?.length) {
        console.error('No questions available for category:', currentSet?.category);
        throw new Error('No questions available for this category');
      }

      const sortedQuestions = currentSet.questions.sort((a, b) => a.order - b.order);
      console.log("Sorted questions:", sortedQuestions);
      
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
      (opt) => opt.value === selectedValue
    );
    
    if (selectedOption?.next) {
      if (selectedOption.next === 'NEXT_BRANCH') return 'NEXT_BRANCH';
      if (selectedOption.next === 'END') return null;
      return selectedOption.next;
    }

    // Check if there are any questions in the branching queue
    if (branchingQueue.length > 0) {
      return branchingQueue[0];
    }

    // If no specific navigation is defined, move to the next question in sequence
    const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
    return currentIndex < questionSequence.length - 1
      ? questionSequence[currentIndex + 1].id
      : 'NEXT_BRANCH';
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    
    // Create the answer object
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
    
    // Update answers state
    setAnswers(prev => ({
      ...prev,
      [currentSet.category]: {
        ...prev[currentSet.category],
        [questionId]: questionAnswer
      }
    }));

    if (currentQuestion.type === 'multiple_choice') {
      // For multiple choice, collect all the next questions from selected options
      const nextQuestions = selectedValues
        .map(value => {
          const option = currentQuestion.options.find(opt => opt.value === value);
          return option?.next;
        })
        .filter((next): next is string => next !== undefined && next !== 'END' && next !== 'NEXT_BRANCH');

      setBranchingQueue(prev => [...prev, ...nextQuestions]);
      
      if (nextQuestions.length > 0) {
        setCurrentQuestionId(nextQuestions[0]);
        setBranchingQueue(prev => prev.slice(1));
      } else {
        moveToNextQuestionSet();
      }
    } else {
      // For single choice questions
      const nextQuestionId = findNextQuestionId(currentQuestion, selectedValues[0]);
      
      if (nextQuestionId === 'NEXT_BRANCH') {
        if (branchingQueue.length > 0) {
          setCurrentQuestionId(branchingQueue[0]);
          setBranchingQueue(prev => prev.slice(1));
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

  const moveToNextQuestionSet = () => {
    setBranchingQueue([]); // Clear branching queue when moving to next set
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
      setIsLoadingQuestions(true);
    } else {
      handleComplete();
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
    branchingQueue.length > 0 || 
    (currentQuestion.type === 'multiple_choice' && currentQuestion.options.some(opt => opt.next));

  return (
    <QuestionCard
      question={currentQuestion}
      selectedAnswers={currentSetAnswers[currentQuestion.id]?.answers || []}
      onSelect={handleAnswer}
      onNext={currentQuestion.type === 'multiple_choice' ? () => handleAnswer(currentQuestion.id, currentSetAnswers[currentQuestion.id]?.answers || []) : undefined}
      isLastQuestion={!hasFollowUpQuestion}
      currentStage={currentSetIndex + 1}
      totalStages={questionSets.length}
      hasFollowUpQuestion={hasFollowUpQuestion}
    />
  );
};

export default QuestionManager;