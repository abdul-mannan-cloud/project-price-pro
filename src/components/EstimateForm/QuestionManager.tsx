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
  const [pendingSubQuestions, setPendingSubQuestions] = useState<Question[]>([]);

  useEffect(() => {
    console.log('Initializing question sequence with category data:', categoryData);
    if (categoryData?.questions?.length > 0) {
      const initialQuestion = categoryData.questions[0];
      setQuestionSequence([initialQuestion]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setPendingSubQuestions([]);
      setShowAdditionalServices(false);
    } else {
      toast({
        title: "Error",
        description: "No questions available for this category.",
        variant: "destructive",
      });
    }
  }, [categoryData]);

  const processSubQuestions = (
    currentQuestion: Question,
    selectedOptions: string[]
  ): Question[] => {
    console.log('Processing sub-questions for:', { currentQuestion, selectedOptions });
    
    let subQuestionsToAdd: Question[] = [];

    selectedOptions.forEach(optionId => {
      const selectedOption = currentQuestion.options.find(opt => opt.id === optionId);
      if (!selectedOption) return;

      const optionLabel = selectedOption.label;
      console.log('Processing option:', { optionId, optionLabel });

      // Check for sub-questions using both ID and label
      const subQuestions = currentQuestion.sub_questions?.[optionId] || 
                          currentQuestion.sub_questions?.[optionLabel] ||
                          currentQuestion.sub_questions?.[selectedOption.value || ''];

      if (subQuestions) {
        console.log('Found sub-questions for option:', optionLabel, subQuestions);
        
        if (Array.isArray(subQuestions)) {
          const formattedSubQuestions = subQuestions.map((sq: any, index: number) => {
            const subQuestion: Question = {
              id: sq.id || `sq-${currentQuestion.id}-${optionId}-${index}`,
              question: sq.question,
              options: Array.isArray(sq.selections) 
                ? sq.selections.map((opt: any, optIndex: number) => ({
                    id: typeof opt === 'string' 
                      ? `${sq.id || `sq-${currentQuestion.id}-${optionId}-${index}`}-${optIndex}`
                      : opt.value || `${sq.id || `sq-${currentQuestion.id}-${optionId}-${index}`}-${optIndex}`,
                    label: typeof opt === 'string' ? opt : opt.label
                  }))
                : [],
              multi_choice: sq.multi_choice || false,
              is_branching: sq.is_branching || false,
              sub_questions: sq.sub_questions || {}
            };
            console.log('Formatted sub-question:', subQuestion);
            return subQuestion;
          });

          subQuestionsToAdd = [...subQuestionsToAdd, ...formattedSubQuestions];
        }
      }
    });

    console.log('All sub-questions to add:', subQuestionsToAdd);
    return subQuestionsToAdd;
  };

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching) {
      const subQuestions = processSubQuestions(currentQuestion, selectedOptions);
      if (subQuestions.length > 0) {
        setPendingSubQuestions(subQuestions);
        // Move to the first sub-question
        const newSequence = [...questionSequence, ...subQuestions];
        setQuestionSequence(newSequence);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // No sub-questions, move to next main question
        handleNext();
      }
    } else if (!currentQuestion.multi_choice) {
      // For non-branching single-choice questions, automatically advance
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