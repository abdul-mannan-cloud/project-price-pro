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

  const logQuestionFlow = async (event: string, currentQuestion: Question, selectedOptions: string[] = [], selectedLabel: string = '', nextQuestion: Question | null = null) => {
    try {
      await supabase.functions.invoke('log-question-flow', {
        body: {
          event,
          currentQuestion,
          selectedOptions,
          selectedLabel,
          nextQuestion,
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
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
      logQuestionFlow('sequence_initialized', null, [], '', sortedQuestions[0]);
    } else {
      toast({
        title: "Error",
        description: "No questions available for this category.",
        variant: "destructive",
      });
    }
  }, [categoryData]);

  const findNextQuestionIndex = (question: Question, selectedLabel: string): number => {
    if (!question) return -1;
    
    logQuestionFlow('finding_next_question', question, [], selectedLabel);

    // For Yes/No questions with branching logic
    if (question.selections?.length === 2 && 
        question.selections[0] === 'Yes' && 
        question.selections[1] === 'No') {
      
      if (selectedLabel === 'No' && typeof question.next_if_no === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === question.next_if_no);
        logQuestionFlow('branching_no', question, [], selectedLabel, 
          nextIndex !== -1 ? questionSequence[nextIndex] : null);
        return nextIndex;
      }
    }

    // For any question with next_question defined
    if (typeof question.next_question === 'number') {
      const nextIndex = questionSequence.findIndex(q => q.order === question.next_question);
      logQuestionFlow('following_next_question', question, [], selectedLabel, 
        nextIndex !== -1 ? questionSequence[nextIndex] : null);
      return nextIndex;
    }

    // If no specific navigation is defined and it's the last question
    if (!question.next_question && question.order === questionSequence.length) {
      return -1;
    }

    // If no specific navigation is defined, go to the next sequential question
    const nextOrder = question.order + 1;
    const nextIndex = questionSequence.findIndex(q => q.order === nextOrder);
    logQuestionFlow('sequential_navigation', question, [], selectedLabel, 
      nextIndex !== -1 ? questionSequence[nextIndex] : null);
    return nextIndex;
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const question = questionSequence[currentQuestionIndex];
    
    await logQuestionFlow('answer_received', question, selectedOptions, selectedLabel);
    
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

      // Only auto-advance for non-branching, single-choice questions
      if (!question.is_branching && !question.multi_choice) {
        const nextIndex = findNextQuestionIndex(question, selectedLabel);
        await logQuestionFlow('auto_navigation', question, selectedOptions, selectedLabel,
          nextIndex !== -1 ? questionSequence[nextIndex] : null);

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          await handleComplete();
        }
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

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion?.id || ''] || []}
      onSelect={(questionId, selectedOptions, selectedLabel) => {
        logQuestionFlow('selection_made', currentQuestion, selectedOptions, selectedLabel);
        handleAnswer(questionId, selectedOptions, selectedLabel);
      }}
      onNext={async () => {
        const nextIndex = findNextQuestionIndex(currentQuestion, answers[currentQuestion?.id || '']?.[0] || '');
        await logQuestionFlow('manual_next', currentQuestion, answers[currentQuestion?.id || ''] || [], 
          answers[currentQuestion?.id || '']?.[0] || '',
          nextIndex !== -1 ? questionSequence[nextIndex] : null);

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          await handleComplete();
        }
      }}
      isLastQuestion={!currentQuestion?.next_question && 
        findNextQuestionIndex(currentQuestion, answers[currentQuestion?.id || '']?.[0] || '') === -1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};