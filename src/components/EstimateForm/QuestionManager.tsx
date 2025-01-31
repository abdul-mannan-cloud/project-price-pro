import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AdditionalServicesGrid } from "./AdditionalServicesGrid";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuestionManagerProps {
  categoryData: CategoryQuestions;
  onComplete: (answers: Record<string, string[]>) => void;
  categories: Category[];
  currentCategory: string;
  onSelectAdditionalCategory: (categoryId: string) => void;
  completedCategories: string[];
}

export const QuestionManager = ({ 
  categoryData, 
  onComplete,
  categories,
  currentCategory,
  onSelectAdditionalCategory,
  completedCategories
}: QuestionManagerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string>('');

  const logQuestionFlow = async (event: string, currentQuestion: Question, selectedOptions: string[] = [], selectedLabel: string = '', nextQuestion: Question | null = null) => {
    try {
      await supabase.functions.invoke('log-question-flow', {
        body: {
          event,
          currentQuestion,
          selectedOptions,
          selectedLabel,
          nextQuestion
        }
      });
    } catch (error) {
      console.error('Error logging question flow:', error);
    }
  };

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      const sortedQuestions = [...categoryData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
      logQuestionFlow('sequence_initialized', null, [], '', sortedQuestions[0]);
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
    } else {
      toast({
        title: "Error",
        description: "No questions available for this category.",
        variant: "destructive",
      });
    }
  }, [categoryData]);

  const findNextQuestionIndex = (currentQuestion: Question, selectedLabel: string): number => {
    if (!currentQuestion) return -1;
    
    logQuestionFlow('finding_next_question', currentQuestion, [], selectedLabel);

    // For Yes/No questions with branching logic
    if (currentQuestion.selections?.length === 2 && 
        currentQuestion.selections[0] === 'Yes' && 
        currentQuestion.selections[1] === 'No') {
      
      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_if_no);
        logQuestionFlow('branching_no', currentQuestion, [], selectedLabel, 
          nextIndex !== -1 ? questionSequence[nextIndex] : null);
        return nextIndex;
      }
    }

    // For any question with next_question defined
    if (typeof currentQuestion.next_question === 'number') {
      const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
      logQuestionFlow('following_next_question', currentQuestion, [], selectedLabel, 
        nextIndex !== -1 ? questionSequence[nextIndex] : null);
      return nextIndex;
    }

    // If no specific navigation is defined, go to the next sequential question
    const nextOrder = currentQuestion.order + 1;
    const nextIndex = questionSequence.findIndex(q => q.order === nextOrder);
    logQuestionFlow('sequential_navigation', currentQuestion, [], selectedLabel, 
      nextIndex !== -1 ? questionSequence[nextIndex] : null);
    return nextIndex;
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    console.log('Handling answer:', { 
      questionId, 
      selectedOptions, 
      selectedLabel,
      currentQuestion: {
        order: currentQuestion.order,
        next_question: currentQuestion.next_question,
        next_if_no: currentQuestion.next_if_no
      }
    });

    setCurrentLabel(selectedLabel);
    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(updatedAnswers);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          project_title: `${currentCategory} Project`,
          category: currentCategory,
          answers: updatedAnswers,
          contractor_id: null,
          user_name: '',
          user_email: '',
          user_phone: '',
          status: 'new'
        });

      if (error) throw error;

      const nextIndex = findNextQuestionIndex(currentQuestion, selectedLabel);
      console.log('Next question determination:', {
        currentOrder: currentQuestion.order,
        selectedLabel,
        nextIndex,
        nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex].order : null
      });

      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        console.log('No more questions found, completing sequence');
        await handleComplete();
      }

    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    console.log('Completing category with answers:', answers);
    if (Object.keys(answers).length === 0) {
      toast({
        title: "Error",
        description: "Please answer at least one question before continuing.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          answers,
          category: currentCategory
        }
      });

      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          estimate_data: data,
          estimated_cost: data.totalCost
        })
        .eq('category', currentCategory)
        .is('user_email', null);

      if (updateError) throw updateError;
      
      setShowAdditionalServices(true);
    } catch (error) {
      console.error('Error processing answers:', error);
      toast({
        title: "Error",
        description: "Failed to process your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedAdditionalCategory(categoryId);
    onSelectAdditionalCategory(categoryId);
  };

  if (isProcessing) {
    return <LoadingScreen message="Processing your answers..." />;
  }

  if (showAdditionalServices) {
    return (
      <AdditionalServicesGrid
        categories={categories.filter(cat => !completedCategories.includes(cat.id))}
        selectedCategory={selectedAdditionalCategory}
        onSelect={handleAdditionalCategorySelect}
        onComplete={() => onComplete(answers)}
        completedCategories={completedCategories}
      />
    );
  }

  const currentQuestion = questionSequence[currentQuestionIndex];

  if (!currentQuestion) {
    return null;
  }

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion?.id || ''] || []}
      onSelect={(questionId, selectedOptions, selectedLabel) => {
        logQuestionFlow('selection_made', currentQuestion, selectedOptions, selectedLabel);
        handleAnswer(questionId, selectedOptions, selectedLabel);
      }}
      onNext={() => {
        const nextIndex = findNextQuestionIndex(currentQuestion, currentLabel);
        logQuestionFlow('manual_next', currentQuestion, [], currentLabel, 
          nextIndex !== -1 ? questionSequence[nextIndex] : null);

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          handleComplete();
        }
      }}
      isLastQuestion={!currentQuestion.next_question && 
        findNextQuestionIndex(currentQuestion, currentLabel) === -1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};
