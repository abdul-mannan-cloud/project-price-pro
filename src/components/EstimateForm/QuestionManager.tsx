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

  const processSubQuestions = (
    currentQuestion: Question,
    selectedOption: string,
    currentSequence: Question[]
  ): Question[] => {
    const subQuestions = currentQuestion.sub_questions?.[selectedOption] || [];
    const currentIndex = currentSequence.indexOf(currentQuestion);
    
    // Map the sub-questions to ensure they have the correct structure
    const formattedSubQuestions = subQuestions.map((sq: any) => ({
      id: sq.id || `sq-${currentQuestion.id}-${selectedOption}`,
      question: sq.question,
      options: Array.isArray(sq.selections) 
        ? sq.selections.map((opt: any, index: number) => ({
            id: typeof opt === 'string' 
              ? `${sq.id || `sq-${currentQuestion.id}-${selectedOption}`}-${index}`
              : opt.value || `${sq.id || `sq-${currentQuestion.id}-${selectedOption}`}-${index}`,
            label: typeof opt === 'string' ? opt : opt.label
          }))
        : [],
      multi_choice: sq.multi_choice || false,
      is_branching: sq.is_branching || false,
      sub_questions: sq.sub_questions || {}
    }));

    return [
      ...currentSequence.slice(0, currentIndex + 1),
      ...formattedSubQuestions,
      ...currentSequence.slice(currentIndex + 1)
    ];
  };

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching) {
      if (!currentQuestion.multi_choice) {
        const selectedOption = selectedOptions[0];
        const newSequence = processSubQuestions(
          currentQuestion,
          selectedOption,
          questionSequence
        );
        
        console.log('New question sequence:', newSequence);
        setQuestionSequence(newSequence);
      } else {
        // For multi-choice questions, process sub-questions for each selected option
        let newSequence = [...questionSequence];
        selectedOptions.forEach(option => {
          newSequence = processSubQuestions(
            currentQuestion,
            option,
            newSequence
          );
        });
        
        console.log('New question sequence (multi):', newSequence);
        setQuestionSequence(newSequence);
      }
    }
  };

  const handleNext = () => {
    const isLastQuestion = currentQuestionIndex === questionSequence.length - 1;
    
    if (isLastQuestion) {
      setShowAdditionalServices(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedAdditionalCategory(categoryId);
    onSelectAdditionalCategory(categoryId);
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