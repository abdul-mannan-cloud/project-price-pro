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
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  useEffect(() => {
    console.log('Initializing question sequence with category data:', categoryData);
    if (categoryData?.questions?.length > 0) {
      // Start with just the first question
      const firstQuestion = {
        ...categoryData.questions[0],
        id: categoryData.questions[0].id || 'q-0',
        options: formatOptions(categoryData.questions[0])
      };
      setQuestionSequence([firstQuestion]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
      setSelectedValues([]);
    } else {
      toast({
        title: "Error",
        description: "No questions available for this category.",
        variant: "destructive",
      });
    }
  }, [categoryData]);

  const formatOptions = (question: Question) => {
    if (question.options) return question.options;
    
    return (question.selections || []).map((opt, index) => {
      if (typeof opt === 'string') {
        return {
          id: `${question.id || ''}-${index}`,
          label: opt,
          value: opt
        };
      }
      return {
        id: opt.value || `${question.id || ''}-${index}`,
        label: opt.label,
        value: opt.value || opt.label
      };
    });
  };

  const findDependentQuestions = (selectedOptionValues: string[]): Question[] => {
    if (!categoryData.questions) return [];

    // Get all questions after the first one that depend on any of the selected values
    return categoryData.questions
      .slice(1) // Skip the first question
      .filter(q => q.depends_on && selectedOptionValues.includes(q.depends_on))
      .map(q => ({
        ...q,
        id: q.id || `q-${Math.random()}`,
        options: formatOptions(q)
      }));
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestionIndex === 0 && currentQuestion.is_branching) {
      // For the first branching question, get the selected values
      const firstQuestionOptions = formatOptions(currentQuestion);
      const selectedOptionValues = firstQuestionOptions
        .filter(opt => selectedOptions.includes(opt.id))
        .map(opt => opt.value || '');

      console.log('Selected option values:', selectedOptionValues);
      setSelectedValues(selectedOptionValues);
      
      // Update question sequence with only the dependent questions
      const dependentQuestions = findDependentQuestions(selectedOptionValues);
      console.log('Found dependent questions:', dependentQuestions);
      
      if (dependentQuestions.length > 0) {
        const updatedSequence = [currentQuestion, ...dependentQuestions];
        console.log('Setting new question sequence:', updatedSequence);
        setQuestionSequence(updatedSequence);
      }

      // Save to leads table
      try {
        const { error } = await supabase
          .from('leads')
          .insert({
            category: currentCategory,
            answers: { [questionId]: selectedOptions },
            contractor_id: null, // Will be set when contractor claims the lead
            user_name: '', // Will be set in contact form
            user_email: '',
            user_phone: '',
            status: 'new'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving to leads:', error);
        toast({
          title: "Error",
          description: "Failed to save your response. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Automatically advance for single-choice questions or when no options are selected
    if (!currentQuestion.multi_choice || selectedOptions.length === 0) {
      handleNext();
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