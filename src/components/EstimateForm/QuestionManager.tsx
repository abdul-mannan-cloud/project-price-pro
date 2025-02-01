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
      await supabase.functions.invoke('log-question-flow', { body: logData });
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
      setIsProcessing(false);

      logQuestionFlow('questions_loaded', {
        questionCount: formattedQuestions.length,
        firstQuestionId: formattedQuestions[0].id
      });
    }
  }, [categoryData]);

  const formatQuestions = (rawQuestions: any[]): Question[] => {
    if (!Array.isArray(rawQuestions)) {
      console.error('Invalid questions format:', rawQuestions);
      return [];
    }

    return rawQuestions.map((q: any, index: number) => {
      let options = [];
      
      if (q.type === 'yes_no') {
        options = [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ];
      } else if (q.type === 'multiple_choice' || q.type === 'single_choice') {
        options = (q.selections || []).map((selection: any, selIndex: number) => ({
          label: typeof selection === 'string' ? selection : selection.label,
          value: typeof selection === 'string' ? 
            selection.toLowerCase().replace(/\s+/g, '_') : 
            selection.value || `option_${selIndex + 1}`,
          image_url: q.image_urls?.[selIndex]
        }));
      }

      return {
        id: q.id || `q-${index + 1}`,
        order: q.order || index + 1,
        question: q.question,
        description: q.description || '',
        type: q.type || (
          options.length === 2 && 
          options[0].label === 'Yes' && 
          options[1].label === 'No' 
            ? 'yes_no' 
            : 'single_choice'
        ),
        options: options,
        next: q.next_question
      };
    });
  };

  const findQuestionById = (questions: Question[], id: string): Question | undefined => {
    return questions.find(q => q.id === id);
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = findQuestionById(questionSequence, questionId);
    if (!currentQuestion) return;

    console.log('Processing answer:', {
      questionId,
      selectedValues,
      currentQuestion
    });

    setAnswers(prev => ({ ...prev, [questionId]: selectedValues }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestion = questionSequence.find(q => q.order === currentQuestion.order + 1);
      const nextQuestionId = nextQuestion?.id;

      await logQuestionFlow('answer_processed', {
        selectedValues,
        nextQuestionId,
        questionType: currentQuestion.type
      });

      if (!nextQuestionId) {
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

    const nextQuestion = questionSequence.find(q => q.order === currentQuestion.order + 1);
    const nextQuestionId = nextQuestion?.id;

    await logQuestionFlow('manual_next', {
      currentQuestionId,
      nextQuestionId
    });

    if (!nextQuestionId) {
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
      isLastQuestion={currentQuestion.order === questionSequence.length}
      currentStage={currentQuestion.order}
      totalStages={questionSequence.length}
    />
  );
};