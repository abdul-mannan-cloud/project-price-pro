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

  const processSubQuestions = (
    currentQuestion: Question,
    selectedOption: string,
    currentSequence: Question[]
  ): Question[] => {
    // Get sub-questions for the selected option from the sub_questions object
    const subQuestions = currentQuestion.sub_questions?.[selectedOption] || [];
    const currentIndex = currentSequence.indexOf(currentQuestion);
    
    // Return a new sequence with sub-questions inserted after the current question
    return [
      ...currentSequence.slice(0, currentIndex + 1),
      ...subQuestions,
      ...currentSequence.slice(currentIndex + 1)
    ];
  };

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching && !currentQuestion.multi_choice) {
      const selectedOption = selectedOptions[0];
      const newSequence = processSubQuestions(
        currentQuestion,
        selectedOption,
        questionSequence
      );
      
      console.log('New question sequence:', newSequence);
      setQuestionSequence(newSequence);
    }
  };

  const handleNext = () => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    const isLastMainQuestion = currentQuestionIndex === questionSequence.length - 1;
    
    // If it's the last question and not a branching question, show additional services
    if (isLastMainQuestion && !currentQuestion.is_branching) {
      setShowAdditionalServices(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedAdditionalCategory(categoryId);
  };

  const handleComplete = () => {
    console.log('Completing category with answers:', answers);
    onComplete(answers);
  };

  if (showAdditionalServices) {
    return (
      <AdditionalServicesGrid
        categories={categories.filter(cat => !completedCategories.includes(cat.id))}
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