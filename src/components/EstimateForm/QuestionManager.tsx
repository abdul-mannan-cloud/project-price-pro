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
    if (categoryData?.questions?.length > 0) {
      // Ensure all questions have a valid order number
      const validQuestions = categoryData.questions.filter(q => typeof q.order === 'number');
      const sortedQuestions = [...validQuestions].sort((a, b) => a.order! - b.order!);

      const questions = sortedQuestions.map(q => ({
        ...q,
        id: `q-${q.order}`,
        options: q.selections?.map((selection, index) => ({
          id: `${q.order}-${index}`,
          label: selection
        })) || [],
        is_branching: q.selections?.length === 2 && 
                     q.selections.includes('Yes') && 
                     q.selections.includes('No')
      }));

      console.log('Initialized questions:', questions);
      setQuestionSequence(questions);
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

  const findNextQuestionIndex = (currentOrder: number): number => {
    return questionSequence.findIndex(q => q.order === currentOrder);
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[]) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    const selectedAnswer = selectedOptions[0];
    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    
    console.log('Processing answer:', {
      currentOrder: currentQuestion.order,
      question: currentQuestion.question,
      answer: selectedAnswer,
      nextIfYes: currentQuestion.next_question,
      nextIfNo: currentQuestion.next_if_no
    });
    
    setAnswers(updatedAnswers);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          category: currentCategory,
          answers: updatedAnswers,
          contractor_id: null,
          user_name: '',
          user_email: '',
          user_phone: '',
          status: 'new'
        });

      if (error) throw error;

      let nextIndex = -1;

      // Strict branching logic based on Yes/No answers
      if (currentQuestion.is_branching) {
        if (selectedAnswer === 'Yes' && currentQuestion.next_question) {
          nextIndex = findNextQuestionIndex(currentQuestion.next_question);
          console.log('YES path - Going to order:', currentQuestion.next_question);
        } else if (selectedAnswer === 'No' && currentQuestion.next_if_no) {
          nextIndex = findNextQuestionIndex(currentQuestion.next_if_no);
          console.log('NO path - Going to order:', currentQuestion.next_if_no);
        }
      } else if (currentQuestion.next_question) {
        // Non-branching questions always follow next_question
        nextIndex = findNextQuestionIndex(currentQuestion.next_question);
        console.log('Normal path - Going to order:', currentQuestion.next_question);
      }

      // Only proceed if we found a valid next question
      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        // If no valid next question is found, we've reached the end
        console.log('No more questions found, completing sequence');
        await handleComplete();
      }

    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
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
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({ estimate_data: data })
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

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion?.id || ''] || []}
      onSelect={handleAnswer}
      onNext={() => {
        if (currentQuestion?.next_question) {
          const nextIndex = findNextQuestionIndex(currentQuestion.next_question);
          if (nextIndex !== -1) {
            setCurrentQuestionIndex(nextIndex);
          } else {
            handleComplete();
          }
        } else {
          handleComplete();
        }
      }}
      isLastQuestion={!currentQuestion?.next_question}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};