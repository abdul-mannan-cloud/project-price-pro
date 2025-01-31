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

  const logQuestionFlow = async (event: string, details: any) => {
    try {
      const currentQuestion = questionSequence[currentQuestionIndex];
      console.log('Logging question flow:', {
        event,
        currentQuestion,
        details
      });
      
      await supabase.functions.invoke('log-question-flow', {
        body: {
          event,
          questionId: currentQuestion?.id,
          questionOrder: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          is_branching: currentQuestion?.selections?.length === 2 && 
                       currentQuestion?.selections[0] === 'Yes' && 
                       currentQuestion?.selections[1] === 'No',
          multi_choice: currentQuestion?.multi_choice,
          ...details,
          currentCategory
        }
      });
    } catch (error) {
      console.error('Error logging question flow:', error);
    }
  };

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      const sortedQuestions = [...categoryData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Sorted questions:', sortedQuestions);
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
      
      const firstQuestion = sortedQuestions[0];
      logQuestionFlow('sequence_initialized', {
        nextQuestionOrder: firstQuestion?.order,
        nextQuestionText: firstQuestion?.question
      });
    }
  }, [categoryData]);

  const findNextQuestionIndex = (currentQuestion: Question, selectedLabel: string): number => {
    if (!currentQuestion) return -1;
    
    const isYesNoQuestion = currentQuestion.selections?.length === 2 && 
                           currentQuestion.selections[0] === 'Yes' && 
                           currentQuestion.selections[1] === 'No';
    
    console.log('Finding next question:', {
      currentOrder: currentQuestion.order,
      selectedLabel,
      nextQuestion: currentQuestion.next_question,
      nextIfNo: currentQuestion.next_if_no,
      isYesNo: isYesNoQuestion
    });

    // Priority handling for Yes/No questions
    if (isYesNoQuestion) {
      // Handle "No" selection first - this should take priority
      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_if_no);
        console.log('No selected - navigating to:', {
          currentOrder: currentQuestion.order,
          nextIfNo: currentQuestion.next_if_no,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
      
      // Then handle "Yes" selection
      if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
        console.log('Yes selected - navigating to:', {
          currentOrder: currentQuestion.order,
          nextQuestion: currentQuestion.next_question,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
    }

    // For non-Yes/No questions or if no specific navigation is defined
    if (typeof currentQuestion.next_question === 'number') {
      const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
      return nextIndex;
    }

    // If we reach here and next_question is null, we've reached the end
    if (currentQuestion.next_question === null) {
      return -1;
    }

    // Default sequential navigation
    const nextOrder = (currentQuestion.order || 0) + 1;
    return questionSequence.findIndex(q => q.order === nextOrder);
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    await logQuestionFlow('answer_received', {
      question: currentQuestion,
      selectedOptions,
      selectedLabel
    });
    
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

      // Never auto-advance, always wait for manual next click
      await logQuestionFlow('selection_complete', {
        question: currentQuestion,
        selectedOptions,
        selectedLabel
      });

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
  if (!currentQuestion) return null;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id || ''] || []}
      onSelect={(questionId, selectedOptions, selectedLabel) => {
        handleAnswer(questionId, selectedOptions, selectedLabel);
      }}
      onNext={async () => {
        const nextIndex = findNextQuestionIndex(
          currentQuestion, 
          answers[currentQuestion.id || '']?.[0] || ''
        );
        
        await logQuestionFlow('manual_next', {
          currentOrder: currentQuestion.order,
          selectedOptions: answers[currentQuestion.id || ''] || [],
          selectedLabel: answers[currentQuestion.id || '']?.[0] || '',
          nextQuestionIndex: nextIndex,
          nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex]?.order : null,
          navigationReason: 'manual_next'
        });

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          await handleComplete();
        }
      }}
      isLastQuestion={currentQuestion.next_question === null}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};
