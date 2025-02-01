import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AdditionalServicesGrid } from "./AdditionalServicesGrid";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { findNextQuestionId, findQuestionById, initializeQuestions } from "@/utils/questionNavigation";

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
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const logQuestionFlow = async (event: string, details: any) => {
    try {
      const currentQuestion = currentQuestionId ? findQuestionById(questionSequence, currentQuestionId) : null;
      
      const logData = {
        timestamp: new Date().toISOString(),
        event,
        currentQuestion: currentQuestion ? {
          id: currentQuestion.id,
          order: currentQuestion.order,
          question: currentQuestion.question,
          type: currentQuestion.type
        } : null,
        category: currentCategory,
        ...details
      };
      
      console.log('Question Flow Event:', logData);

      await supabase.functions.invoke('log-question-flow', {
        body: logData
      });
    } catch (error) {
      console.error('Error logging question flow:', error);
    }
  };

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      console.log('Raw category data:', categoryData);
      const formattedQuestions = formatQuestions(categoryData.questions);
      console.log('Formatted questions:', formattedQuestions);
      
      setQuestionSequence(formattedQuestions);
      setCurrentQuestionId(formattedQuestions[0].id);
      setAnswers({});
      setShowAdditionalServices(false);

      // Log initial question load
      logQuestionFlow('questions_loaded', {
        questionCount: formattedQuestions.length,
        firstQuestionId: formattedQuestions[0].id
      });
    }
  }, [categoryData]);

  const formatQuestions = (rawQuestions: any[]): Question[] => {
    console.log('Raw questions before formatting:', rawQuestions);
    
    return rawQuestions.map((q: any) => {
      let options = [];
      
      if (q.type === 'yes_no') {
        options = [
          { label: 'Yes', value: 'yes', next: q.options?.find((opt: any) => opt.value === 'yes')?.next },
          { label: 'No', value: 'no', next: q.options?.find((opt: any) => opt.value === 'no')?.next }
        ];
      } else if (Array.isArray(q.options)) {
        options = q.options.map((opt: any) => ({
          label: opt.label,
          value: opt.value,
          next: opt.next,
          image_url: opt.image_url
        }));
      }

      const formattedQuestion: Question = {
        id: q.id,
        order: q.order,
        question: q.question,
        description: q.description,
        type: q.type,
        options: options,
        next: q.next
      };

      console.log('Formatted question:', formattedQuestion);
      return formattedQuestion;
    });
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = findQuestionById(questionSequence, questionId);
    if (!currentQuestion) return;

    console.log('Processing answer:', {
      questionId,
      selectedValues,
      currentQuestion: {
        id: currentQuestion.id,
        order: currentQuestion.order,
        type: currentQuestion.type
      }
    });

    setAnswers(prev => ({ ...prev, [questionId]: selectedValues }));

    if (currentQuestion.type !== 'multiple_choice') {
      const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValues[0]);
      const nextQuestionId = selectedOption?.next || currentQuestion.next;

      await logQuestionFlow('answer_processed', {
        selectedValues,
        nextQuestionId,
        questionType: currentQuestion.type
      });

      if (nextQuestionId === 'END' || !nextQuestionId) {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
  };

  const handleNext = async () => {
    if (!currentQuestionId) return;
    
    const currentQuestion = findQuestionById(questionSequence, currentQuestionId);
    if (!currentQuestion) return;

    const nextQuestionId = currentQuestion.next;

    await logQuestionFlow('manual_next', {
      currentQuestionId,
      nextQuestionId
    });

    if (nextQuestionId === 'END' || !nextQuestionId) {
      await handleComplete();
    } else {
      setCurrentQuestionId(nextQuestionId);
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

  const currentQuestion = currentQuestionId ? findQuestionById(questionSequence, currentQuestionId) : null;
  if (!currentQuestion) return null;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={!currentQuestion.next || currentQuestion.next === 'END'}
      currentStage={currentQuestion.order}
      totalStages={questionSequence.length}
    />
  );
};