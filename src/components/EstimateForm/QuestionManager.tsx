import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AdditionalServicesGrid } from "./AdditionalServicesGrid";
import { Question, CategoryQuestions, Category } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    console.log('Initializing question sequence with category data:', categoryData);
    if (categoryData?.questions?.length > 0) {
      setQuestionSequence([categoryData.questions[0]]);
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

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching && categoryData.branching_logic?.[questionId]) {
      console.log('Processing branching logic for:', questionId);
      const nextQuestionIds = categoryData.branching_logic[questionId][selectedOptions[0]] || [];
      
      if (currentQuestion.sub_questions) {
        const relevantSubQuestions = currentQuestion.sub_questions.filter(q => 
          nextQuestionIds.includes(q.id)
        );
        
        console.log('Relevant sub-questions:', relevantSubQuestions);
        
        const remainingMainQuestions = categoryData.questions.slice(currentQuestionIndex + 1);
        const newSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          ...relevantSubQuestions,
          ...remainingMainQuestions
        ];
        
        setQuestionSequence(newSequence);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionSequence.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowAdditionalServices(true);
    }
  };

  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedAdditionalCategory(categoryId);
  };

  const handleComplete = () => {
    console.log('Completing category with answers:', answers);
    onComplete(answers);
  };

  const handleContinueWithAdditional = () => {
    if (selectedAdditionalCategory) {
      onSelectAdditionalCategory(selectedAdditionalCategory);
    }
  };

  if (showAdditionalServices) {
    return (
      <AdditionalServicesGrid
        categories={categories}
        selectedCategory={selectedAdditionalCategory}
        onSelect={handleAdditionalCategorySelect}
        onComplete={handleComplete}
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