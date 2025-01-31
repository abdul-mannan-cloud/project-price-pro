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

  const findNextQuestionByText = (text: string): Question | undefined => {
    console.log('Finding question with text:', text);
    return categoryData.questions.find(q => q.question === text);
  };

  const getNextQuestion = (currentQuestion: Question, answer: string): Question | undefined => {
    console.log('Getting next question for:', currentQuestion.question, 'with answer:', answer);
    
    // If it's a branching question and answer is "No", find the question specified in next_if_no
    if (currentQuestion.is_branching && answer === "No" && currentQuestion.next_if_no) {
      console.log('Following next_if_no branch:', currentQuestion.next_if_no);
      const nextBranchQuestion = findNextQuestionByText(currentQuestion.next_if_no);
      if (nextBranchQuestion) {
        // Update the sequence to skip to the branched question
        const newSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          nextBranchQuestion
        ];
        console.log('New question sequence after branching:', newSequence);
        setQuestionSequence(newSequence);
        return nextBranchQuestion;
      }
    }

    // For "Yes" or non-branching questions, get the next sequential question
    const currentIndex = categoryData.questions.findIndex(q => q.question === currentQuestion.question);
    if (currentIndex !== -1 && currentIndex + 1 < categoryData.questions.length) {
      const nextQuestion = categoryData.questions[currentIndex + 1];
      // Only add to sequence if following linear path
      if (!currentQuestion.is_branching || answer === "Yes") {
        setQuestionSequence(prev => [...prev, nextQuestion]);
      }
      return nextQuestion;
    }

    console.log('No next question found');
    return undefined;
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    const selectedAnswer = selectedOptions[0];

    // Save to leads table
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          category: currentCategory,
          answers: { [questionId]: selectedOptions },
          contractor_id: null,
          user_name: '',
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

    const nextQuestion = getNextQuestion(currentQuestion, selectedAnswer);
    
    if (nextQuestion) {
      console.log('Setting next question:', nextQuestion);
      if (!currentQuestion.multi_choice) {
        // For single-choice questions, auto-advance after a short delay
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
        }, 300);
      }
    } else {
      console.log('No more questions, proceeding to completion');
      handleComplete();
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
      selectedOptions={answers[currentQuestion?.id || ''] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={currentQuestionIndex === questionSequence.length - 1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};
