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
  completedCategories,
}: QuestionManagerProps) => {
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        if (!categoryData?.questions?.length) {
          throw new Error('No questions available');
        }

        console.log('Raw category data:', categoryData);
        // Sort questions by order property and ensure proper typing
        const sortedQuestions = [...categoryData.questions]
          .sort((a, b) => a.order - b.order)
          .map(q => ({
            ...q,
            type: q.type || (q.options.length === 2 && 
                   q.options[0].label.toLowerCase() === 'yes' && 
                   q.options[1].label.toLowerCase() === 'no' 
                   ? 'yes_no' : 'single_choice'),
            options: q.options.map(opt => ({
              ...opt,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_')
            }))
          }));

        setQuestionSequence(sortedQuestions);
        setCurrentQuestionId(sortedQuestions[0].id);
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

  const findNextQuestionId = (currentQuestion: Question, selectedValue: string): string | null => {
    // First check if the selected option has a next question specified
    const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValue);
    if (selectedOption?.next) {
      return selectedOption.next === 'END' ? null : selectedOption.next;
    }

    // If the current question has a next property, use that
    if (currentQuestion.next) {
      return currentQuestion.next === 'END' ? null : currentQuestion.next;
    }

    // If no specific navigation is defined, move to the next question in order
    const currentIndex = questionSequence.findIndex(q => q.id === currentQuestion.id);
    return currentIndex < questionSequence.length - 1 ? questionSequence[currentIndex + 1].id : null;
  };

  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find(q => q.id === questionId);
    if (!currentQuestion) return;

    setAnswers(prev => ({ ...prev, [questionId]: selectedValues }));

    if (currentQuestion.type !== 'multiple_choice') {
      const nextQuestionId = findNextQuestionId(currentQuestion, selectedValues[0]);
      
      if (!nextQuestionId) {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
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
      const formattedAnswers = Object.entries(answers).map(([questionId, values]) => {
        const question = questionSequence.find(q => q.id === questionId);
        return {
          question: question?.question,
          answers: values.map(value => 
            question?.options.find(opt => opt.value === value)?.label || value
          )
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          answers: formattedAnswers,
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
        categories={categories}
        selectedCategory={selectedAdditionalCategory}
        onSelect={handleAdditionalCategorySelect}
        onComplete={() => onComplete(answers)}
        completedCategories={completedCategories}
      />
    );
  }

  const currentQuestion = questionSequence.find(q => q.id === currentQuestionId);

  if (!currentQuestion) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">
          No questions available. Please try selecting a different category.
        </p>
      </div>
    );
  }

  const isLastQuestion = !findNextQuestionId(currentQuestion, currentQuestion.options[0].value);

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleComplete}
      isLastQuestion={isLastQuestion}
      currentStage={currentQuestion.order}
      totalStages={questionSequence.length}
    />
  );
};