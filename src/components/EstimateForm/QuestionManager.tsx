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

  useEffect(() => {
    console.log('Initializing question sequence with category data:', categoryData);
    if (categoryData?.questions?.length > 0) {
      const initialQuestion = categoryData.questions[0];
      setQuestionSequence([initialQuestion]);
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

  const findSubQuestions = (
    currentQuestion: Question,
    selectedValue: string
  ): Question[] => {
    console.log('Finding sub-questions for:', { currentQuestion, selectedValue });
    
    // Check sub_questions using the value
    if (currentQuestion.sub_questions?.[selectedValue]) {
      return currentQuestion.sub_questions[selectedValue].map((sq: any) => ({
        id: sq.id || `${currentQuestion.id}-${selectedValue}-${Math.random()}`,
        question: sq.question,
        options: Array.isArray(sq.selections) 
          ? sq.selections.map((opt: any, index: number) => ({
              id: typeof opt === 'string' 
                ? `${sq.id || currentQuestion.id}-${selectedValue}-${index}`
                : opt.value || `${sq.id || currentQuestion.id}-${selectedValue}-${index}`,
              label: typeof opt === 'string' ? opt : opt.label,
              value: typeof opt === 'string' ? opt : opt.value
            }))
          : [],
        multi_choice: sq.multi_choice || false,
        is_branching: sq.is_branching || false,
        sub_questions: sq.sub_questions || {}
      }));
    }

    // If no sub-questions found using value, try finding by option label
    const selectedOption = currentQuestion.options.find(opt => 
      opt.id === selectedValue || opt.value === selectedValue
    );
    
    if (selectedOption && currentQuestion.sub_questions?.[selectedOption.value || selectedOption.label]) {
      const subQuestions = currentQuestion.sub_questions[selectedOption.value || selectedOption.label];
      return subQuestions.map((sq: any) => ({
        id: sq.id || `${currentQuestion.id}-${selectedValue}-${Math.random()}`,
        question: sq.question,
        options: Array.isArray(sq.selections) 
          ? sq.selections.map((opt: any, index: number) => ({
              id: typeof opt === 'string' 
                ? `${sq.id || currentQuestion.id}-${selectedValue}-${index}`
                : opt.value || `${sq.id || currentQuestion.id}-${selectedValue}-${index}`,
              label: typeof opt === 'string' ? opt : opt.label,
              value: typeof opt === 'string' ? opt : opt.value
            }))
          : [],
        multi_choice: sq.multi_choice || false,
        is_branching: sq.is_branching || false,
        sub_questions: sq.sub_questions || {}
      }));
    }

    return [];
  };

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching) {
      let newQuestions: Question[] = [];
      
      // For multi-choice questions, collect sub-questions for all selected options
      if (currentQuestion.multi_choice) {
        selectedOptions.forEach(option => {
          const subQuestions = findSubQuestions(currentQuestion, option);
          newQuestions = [...newQuestions, ...subQuestions];
        });
      } else {
        // For single-choice questions, get sub-questions for the selected option
        newQuestions = findSubQuestions(currentQuestion, selectedOptions[0]);
      }

      if (newQuestions.length > 0) {
        console.log('Adding sub-questions:', newQuestions);
        const updatedSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          ...newQuestions,
          ...questionSequence.slice(currentQuestionIndex + 1)
        ];
        setQuestionSequence(updatedSequence);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleNext();
      }
    } else if (!currentQuestion.multi_choice) {
      setTimeout(() => handleNext(), 300);
    }
  };

  const handleNext = () => {
    const isLastQuestion = currentQuestionIndex === questionSequence.length - 1;
    
    if (isLastQuestion) {
      handleComplete();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
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
    console.log('No current question available');
    return null;
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