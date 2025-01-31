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
  const [currentLabel, setCurrentLabel] = useState<string>('');

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      const sortedQuestions = [...categoryData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Initialized questions:', sortedQuestions.map(q => ({
        order: q.order,
        question: q.question,
        next_question: q.next_question,
        next_if_no: q.next_if_no
      })));
      setQuestionSequence(sortedQuestions);
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

  const findNextQuestionIndex = (currentQuestion: Question, selectedLabel: string): number => {
    if (!currentQuestion) return -1;
    
    console.log('Navigation check:', { 
      currentQuestionId: currentQuestion.id,
      currentOrder: currentQuestion.order,
      selectedLabel,
      next_if_no: currentQuestion.next_if_no,
      next_question: currentQuestion.next_question
    });

    // For Yes/No questions with branching logic
    if (currentQuestion.selections?.length === 2 && 
        currentQuestion.selections[0] === 'Yes' && 
        currentQuestion.selections[1] === 'No') {
      
      console.log('Processing Yes/No question:', {
        selectedLabel,
        next_if_no: currentQuestion.next_if_no,
        next_question: currentQuestion.next_question
      });

      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        console.log(`No selected - going to order ${currentQuestion.next_if_no}`);
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_if_no);
        console.log('Found next index for No:', nextIndex);
        return nextIndex;
      } else if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
        console.log(`Yes selected - going to order ${currentQuestion.next_question}`);
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
        console.log('Found next index for Yes:', nextIndex);
        return nextIndex;
      }
    }

    // For non-Yes/No questions with next_question defined
    if (typeof currentQuestion.next_question === 'number') {
      console.log(`Following next_question to order ${currentQuestion.next_question}`);
      const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
      console.log('Found next index:', nextIndex);
      return nextIndex;
    }

    // If no specific navigation is defined, go to the next sequential question
    const nextOrder = currentQuestion.order + 1;
    const nextIndex = questionSequence.findIndex(q => q.order === nextOrder);
    console.log('Next sequential order:', nextOrder, 'Found index:', nextIndex);
    return nextIndex;
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    console.log('Handling answer:', { 
      questionId, 
      selectedOptions, 
      selectedLabel,
      currentQuestion,
      currentQuestionIndex,
      currentQuestionOrder: currentQuestion?.order
    });

    setCurrentLabel(selectedLabel);
    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(updatedAnswers);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          project_title: `${currentCategory} Project`,
          category: currentCategory,
          answers: updatedAnswers,
          contractor_id: null,
          user_name: '',
          user_email: '',
          user_phone: '',
          status: 'new'
        });

      if (error) throw error;

      const nextIndex = findNextQuestionIndex(currentQuestion, selectedLabel);
      console.log('Next question determination:', {
        currentOrder: currentQuestion.order,
        selectedLabel,
        nextIndex,
        nextQuestionOrder: questionSequence[nextIndex]?.order
      });

      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex);
      } else {
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
    return null;
  }

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion?.id || ''] || []}
      onSelect={(questionId, selectedOptions, selectedLabel) => {
        console.log('Selection made:', { 
          questionId, 
          selectedOptions, 
          selectedLabel,
          currentQuestionIndex,
          currentQuestionOrder: currentQuestion?.order
        });
        handleAnswer(questionId, selectedOptions, selectedLabel);
      }}
      onNext={() => {
        const nextIndex = findNextQuestionIndex(currentQuestion, currentLabel);
        console.log('Manual next navigation:', { 
          currentQuestion, 
          selectedLabel: currentLabel, 
          nextIndex,
          nextQuestionOrder: questionSequence[nextIndex]?.order
        });

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          handleComplete();
        }
      }}
      isLastQuestion={!currentQuestion.next_question && 
        findNextQuestionIndex(currentQuestion, currentLabel) === -1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};
