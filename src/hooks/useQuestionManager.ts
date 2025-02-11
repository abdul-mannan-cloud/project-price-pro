import { useState, useEffect } from "react";
import { Question, CategoryQuestions, AnswersState, QuestionAnswer } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useQuestionManager = (
  questionSets: CategoryQuestions[],
  onComplete: (answers: AnswersState) => void,
  onProgressChange: (progress: number) => void
) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [queuedNextQuestions, setQueuedNextQuestions] = useState<string[]>([]);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [pendingBranchTransition, setPendingBranchTransition] = useState(false);

  const calculateProgress = () => {
    if (questionSets.length === 0) return 0;

    let answeredCount = 0;
    let totalQuestions = 0;

    Object.entries(answers).forEach(([category, categoryAnswers]) => {
      Object.entries(categoryAnswers || {}).forEach(([questionId, answer]) => {
        answeredCount++;
        
        const currentSet = questionSets.find(set => set.category === category);
        const question = currentSet?.questions.find(q => q.id === questionId);
        
        if (question) {
          const selectedOptions = question.options.filter(opt => 
            answer.answers.includes(opt.value)
          );
          
          selectedOptions.forEach(opt => {
            if (opt.next && opt.next !== 'END' && opt.next !== 'NEXT_BRANCH') {
              totalQuestions++;
            }
          });
        }
      });
    });

    questionSets.forEach(set => {
      if (Array.isArray(set.questions)) {
        totalQuestions += set.questions.length;
      }
    });

    const progress = totalQuestions > 0 
      ? (answeredCount / totalQuestions) * 100 
      : 0;

    return Math.min(progress, 100);
  };

  const loadCurrentQuestionSet = () => {
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

  const handleBranchTransition = () => {
    if (queuedNextQuestions.length > 0) {
      setCurrentQuestionId(queuedNextQuestions[0]);
      setQueuedNextQuestions(prev => prev.slice(1));
      setPendingBranchTransition(false);
    } else {
      moveToNextQuestionSet();
    }
  };

  const moveToNextQuestionSet = () => {
    console.log('Moving to next question set, current index:', currentSetIndex, 'total sets:', questionSets.length);
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (currentSetIndex < questionSets.length - 1) {
      moveToNextQuestionSet();
      return;
    }

    console.log('Starting estimate generation with answers:', answers);
    setIsGeneratingEstimate(true);
    
    try {
      await onComplete(answers);
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

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  useEffect(() => {
    if (!isLoadingQuestions && pendingBranchTransition) {
      handleBranchTransition();
    }
  }, [pendingBranchTransition, isLoadingQuestions]);

  useEffect(() => {
    const progress = calculateProgress();
    console.log('Updating progress:', progress);
    onProgressChange(progress);
  }, [answers, questionSets]);

  return {
    currentQuestion: questionSequence.find(q => q.id === currentQuestionId),
    currentSet: questionSets[currentSetIndex],
    currentSetAnswers: answers[questionSets[currentSetIndex]?.category] || {},
    isLoadingQuestions,
    isGeneratingEstimate,
    hasFollowUpQuestion: currentSetIndex < questionSets.length - 1 || 
      queuedNextQuestions.length > 0 ||
      (currentQuestionId && questionSequence.find(q => q.id === currentQuestionId)?.type === 'multiple_choice' && 
       questionSequence.find(q => q.id === currentQuestionId)?.options.some(opt => opt.next)),
    currentStage: currentSetIndex + 1,
    totalStages: questionSets.length,
    handleAnswer,
    handleMultipleChoiceNext
  };
};
