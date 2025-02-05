import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, AnswersState, QuestionAnswer } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [queuedNextQuestions, setQueuedNextQuestions] = useState<string[]>([]);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [pendingBranchTransition, setPendingBranchTransition] = useState(false);
  const [showingEstimate, setShowingEstimate] = useState(false);

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  useEffect(() => {
    if (!isLoadingQuestions && pendingBranchTransition) {
      handleBranchTransition();
    }
  }, [pendingBranchTransition, isLoadingQuestions]);

  useEffect(() => {
    // Calculate and update progress including the final contact screen
    const currentSet = questionSets[currentSetIndex];
    const loadedQuestions = currentSet?.questions?.length || 0;
    
    const answeredQuestions = currentSet ? 
      Object.keys(answers[currentSet.category] || {}).length : 0;

    // Add 2 additional steps for estimate generation and contact info
    const totalSteps = loadedQuestions + 2;
    let currentStep = answeredQuestions;

    // If we're generating the estimate, show near completion
    if (isGeneratingEstimate) {
      currentStep = loadedQuestions + 1;
    }

    // If we're showing the estimate, show full completion
    if (showingEstimate) {
      currentStep = totalSteps;
    }

    const progress = Math.min((currentStep / totalSteps) * 100, 100);
    onProgressChange(progress);
  }, [answers, currentSetIndex, questionSets, onProgressChange, isGeneratingEstimate, showingEstimate]);

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

  const handleBranchTransition = () => {
    if (queuedNextQuestions.length > 0) {
      setCurrentQuestionId(queuedNextQuestions[0]);
      setQueuedNextQuestions(prev => prev.slice(1));
      setPendingBranchTransition(false);
    } else {
      moveToNextQuestionSet();
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
      handleSingleChoiceNavigation(currentQuestion, selectedValues[0]);
    }
  };

  const handleSingleChoiceNavigation = (currentQuestion: Question, selectedValue: string) => {
    const selectedOption = currentQuestion.options.find(
      opt => opt.value.toLowerCase() === selectedValue.toLowerCase()
    );

    if (selectedOption?.next === 'NEXT_BRANCH') {
      setPendingBranchTransition(true);
    } else if (selectedOption?.next === 'END' || !selectedOption?.next) {
      moveToNextQuestionSet();
    } else if (selectedOption?.next) {
      setCurrentQuestionId(selectedOption.next);
    } else {
      const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questionSequence.length - 1) {
        setCurrentQuestionId(questionSequence[currentIndex + 1].id);
      } else {
        moveToNextQuestionSet();
      }
    }
  };

  const moveToNextQuestionSet = () => {
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (currentSetIndex < questionSets.length - 1) {
      moveToNextQuestionSet();
    } else {
      setIsGeneratingEstimate(true);
      try {
        const { data: estimateData, error } = await supabase.functions.invoke('generate-estimate', {
          body: { answers }
        });

        if (error) throw error;
        setShowingEstimate(true);
        onComplete(answers);
      } catch (error) {
        console.error('Error generating estimate:', error);
        toast({
          title: "Error",
          description: "Failed to generate estimate. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingEstimate(false);
      }
    }
  };

  const handleMultipleChoiceNext = async () => {
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    const currentSetAnswers = answers[currentSet.category] || {};
    const selectedValues = currentSetAnswers[currentQuestion.id]?.answers || [];
    
    if (selectedValues.length === 0) return;

    const nextQuestions = selectedValues.reduce((acc: string[], value: string) => {
      const option = currentQuestion.options.find(opt => opt.value === value);
      if (option?.next && option.next !== 'END' && option.next !== 'NEXT_BRANCH') {
        acc.push(option.next);
      }
      return acc;
    }, []);

    const uniqueNextQuestions = Array.from(new Set(nextQuestions));

    if (uniqueNextQuestions.length > 0) {
      setCurrentQuestionId(uniqueNextQuestions[0]);
      if (uniqueNextQuestions.length > 1) {
        setQueuedNextQuestions(uniqueNextQuestions.slice(1));
      }
    } else {
      const shouldMoveToNextBranch = selectedValues.some(value => {
        const option = currentQuestion.options.find(opt => opt.value === value);
        return option?.next === 'NEXT_BRANCH';
      });

      if (shouldMoveToNextBranch) {
        setPendingBranchTransition(true);
      } else {
        moveToNextQuestionSet();
      }
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
      isLastQuestion={currentSetIndex === questionSets.length - 1}
      currentStage={currentSetIndex + 1}
      totalStages={questionSets.length}
      hasFollowUpQuestion={hasFollowUpQuestion}
    />
  );
};

export default QuestionManager;
