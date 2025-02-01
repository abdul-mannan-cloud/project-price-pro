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
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

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
        options = Array.isArray(q.selections) ? q.selections.map((selection: any, selIndex: number) => ({
          label: typeof selection === 'string' ? selection : selection.label,
          value: typeof selection === 'string' ? 
            selection.toLowerCase().replace(/\s+/g, '_') : 
            selection.value || `option_${selIndex + 1}`,
          image_url: q.image_urls?.[selIndex]
        })) : [];
      }

      return {
        id: q.id || `q-${index + 1}`,
        order: q.order || index + 1,
        question: q.question,
        description: q.description || '',
        type: q.type || 'single_choice',
        options
      };
    });
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        if (!categoryData?.questions?.length) {
          throw new Error('No questions available');
        }

        console.log('Raw category data:', categoryData);
        const formattedQuestions = formatQuestions(categoryData.questions);
        console.log('Formatted questions:', formattedQuestions);
        
        if (formattedQuestions.length === 0) {
          throw new Error('No questions available for this category');
        }

        setQuestionSequence(formattedQuestions);
        setCurrentQuestionId(formattedQuestions[0].id);
        setAnswers({});
        setShowAdditionalServices(false);
        setIsProcessing(false);
      } catch (error) {
        console.error('Error loading questions:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load questions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    if (categoryData) {
      loadQuestions();
    }
  }, [categoryData]);

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    console.log('Processing answer:', {
      questionId,
      selectedValues,
      currentQuestion
    });

    setAnswers(prev => ({ ...prev, [questionId]: selectedValues }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestion = questionSequence.find(q => q.order === currentQuestion.order + 1);
      if (!nextQuestion) {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestion.id);
      }
    }
  };

  const handleNext = async () => {
    if (!currentQuestionId) return;
    
    const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);
    if (!currentQuestion) return;

    const nextQuestion = questionSequence.find(q => q.order === currentQuestion.order + 1);
    if (!nextQuestion) {
      await handleComplete();
    } else {
      setCurrentQuestionId(nextQuestion.id);
    }
  };

  const handleComplete = async () => {
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

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

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

  const currentQuestion = currentQuestionId ? questionSequence.find(q => q.id === currentQuestionId) : null;
  if (!currentQuestion) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">No questions available. Please try selecting a different category.</p>
      </div>
    );
  }

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