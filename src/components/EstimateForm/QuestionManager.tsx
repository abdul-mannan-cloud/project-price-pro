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

  useEffect(() => {
    loadCurrentQuestionSet();
  }, [currentSetIndex, questionSets]);

  useEffect(() => {
    if (!isLoadingQuestions && !questionSequence.find(q => q.id === currentQuestionId)) {
      if (queuedNextQuestions.length > 0) {
        setCurrentQuestionId(queuedNextQuestions[0]);
        setQueuedNextQuestions(queuedNextQuestions.slice(1));
      } else {
        handleComplete();
      }
    }
  }, [currentQuestionId, isLoadingQuestions, questionSequence, queuedNextQuestions]);

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

  const moveToNextQuestionSet = () => {
    if (currentSetIndex < questionSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    const currentSet = questionSets[currentSetIndex];
    
    // Create the answer object with both question and answer data
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
    
    // Update the answers state with the new format
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
          setQueuedNextQuestions(queuedNextQuestions.slice(1));
        } else {
          moveToNextQuestionSet();
        }
      } else if (!nextQuestionId) {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
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
    (currentQuestion.type === 'multiple_choice' && currentQuestion.options.some(opt => opt.next));

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={currentSetAnswers[currentQuestion.id]?.answers || []}
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
