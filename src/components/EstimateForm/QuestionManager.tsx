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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (categoryData && Array.isArray(categoryData.questions) && categoryData.questions.length > 0) {
      const formattedQuestions: Question[] = categoryData.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        description: q.description,
        type: q.type || 'single_choice',
        options: Array.isArray(q.options)
          ? q.options.map((opt: any, index: number) => ({
              id: `${q.id}-${index}`,
              label: opt.label,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
              next: opt.next,
              image_url: opt.image_url,
            }))
          : [],
        next: q.next || null,
        order: q.order || 0
      }));
      setQuestionSequence(formattedQuestions);
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

  const findNextQuestionId = (currentQuestion: Question, selectedValue: string): string | null => {
    const selectedOption = currentQuestion.options.find(
      (opt) => opt.value === selectedValue
    );
    if (selectedOption?.next) {
      return selectedOption.next;
    }
    if (currentQuestion.next) {
      return currentQuestion.next;
    }
    const currentIndex = questionSequence.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex < questionSequence.length - 1) {
      return questionSequence[currentIndex + 1].id;
    }
    return null;
  };

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptions }));
    const currentQuestion = questionSequence[currentQuestionIndex];
    if (currentQuestion.type !== 'multiple_choice') {
      const nextId = findNextQuestionId(currentQuestion, selectedOptions[0]);
      if (!nextId || nextId === "END") {
        handleComplete();
      } else {
        const nextIndex = questionSequence.findIndex((q) => q.id === nextId);
        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionSequence.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleComplete();
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

      const { data, error } = await supabase.functions.invoke("generate-estimate", {
        body: { 
          answers: formattedAnswers,
          category: currentCategory,
        },
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
      console.error("Error processing answers:", error);
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
        categories={categories}
        selectedCategory={selectedAdditionalCategory}
        onSelect={handleAdditionalCategorySelect}
        onComplete={() => onComplete(answers)}
        completedCategories={completedCategories}
      />
    );
  }

  const currentQuestion = questionSequence[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="text-center p-8">No questions available.</div>;
  }
  
  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={currentQuestionIndex === questionSequence.length - 1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};

export default QuestionManager;