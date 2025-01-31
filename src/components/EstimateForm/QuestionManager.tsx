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

  // Find question by its order number
  const findQuestionByOrder = (order: number): Question | undefined => {
    return questionSequence.find(q => q.order === order);
  };

  // Get index of question by its order number
  const findQuestionIndexByOrder = (order: number): number => {
    const index = questionSequence.findIndex(q => q.order === order);
    console.log(`Finding question with order ${order}, found at index: ${index}`);
    return index;
  };

  // Determine if a question is a yes/no question
  const isYesNoQuestion = (question: Question): boolean => {
    return question.selections?.length === 2 && 
           question.selections[0] === 'Yes' && 
           question.selections[1] === 'No';
  };

  // Get the next question based on the current question and answer
  const getNextQuestionIndex = (currentQuestion: Question, selectedLabel: string): number => {
    console.log('Navigation attempt:', {
      currentOrder: currentQuestion.order,
      selectedLabel,
      nextQuestion: currentQuestion.next_question,
      nextIfNo: currentQuestion.next_if_no,
      isYesNo: isYesNoQuestion(currentQuestion)
    });

    if (isYesNoQuestion(currentQuestion)) {
      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        const nextIndex = findQuestionIndexByOrder(currentQuestion.next_if_no);
        console.log(`No selected, going to next_if_no order ${currentQuestion.next_if_no}, index: ${nextIndex}`);
        return nextIndex;
      } else if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
        const nextIndex = findQuestionIndexByOrder(currentQuestion.next_question);
        console.log(`Yes selected, going to next_question order ${currentQuestion.next_question}, index: ${nextIndex}`);
        return nextIndex;
      }
    } else if (typeof currentQuestion.next_question === 'number') {
      const nextIndex = findQuestionIndexByOrder(currentQuestion.next_question);
      console.log(`Non-branching question, going to next_question order ${currentQuestion.next_question}, index: ${nextIndex}`);
      return nextIndex;
    }

    // If no specific navigation is defined, go to the next sequential order
    const nextOrder = currentQuestion.order + 1;
    const nextIndex = findQuestionIndexByOrder(nextOrder);
    console.log(`Sequential navigation to order ${nextOrder}, index: ${nextIndex}`);
    return nextIndex;
  };

  const logQuestionFlow = async (event: string, details: any) => {
    try {
      const currentQuestion = questionSequence[currentQuestionIndex];
      
      const logData = {
        timestamp: new Date().toISOString(),
        event,
        currentQuestion: {
          order: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          is_branching: isYesNoQuestion(currentQuestion),
          multi_choice: currentQuestion?.multi_choice
        },
        ...details
      };
      
      console.log('Question Flow Event:', logData);

      await supabase.functions.invoke('log-question-flow', {
        body: {
          event,
          questionId: currentQuestion?.id,
          questionOrder: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          is_branching: isYesNoQuestion(currentQuestion),
          multi_choice: currentQuestion?.multi_choice,
          category: currentCategory,
          ...details
        }
      });
    } catch (error) {
      console.error('Error logging question flow:', error);
    }
  };

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      const sortedQuestions = [...categoryData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Initializing questions for category:', {
        category: currentCategory,
        questions: sortedQuestions.map(q => ({
          order: q.order,
          question: q.question,
          next_question: q.next_question,
          next_if_no: q.next_if_no,
          isYesNo: isYesNoQuestion(q)
        }))
      });
      
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
    }
  }, [categoryData, currentCategory]);

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    
    console.log('Processing answer:', {
      questionId,
      selectedOptions,
      selectedLabel,
      currentQuestion: {
        order: currentQuestion.order,
        next_question: currentQuestion.next_question,
        next_if_no: currentQuestion.next_if_no,
        isYesNo: isYesNoQuestion(currentQuestion)
      }
    });

    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(updatedAnswers);

    // Get next question index based on answer
    const nextIndex = getNextQuestionIndex(currentQuestion, selectedLabel);

    await logQuestionFlow('answer_processed', {
      selectedOptions,
      selectedLabel,
      nextQuestionIndex: nextIndex,
      nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex]?.order : null
    });

    if (nextIndex !== -1) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      await handleComplete();
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
  if (!currentQuestion) return null;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id || ''] || []}
      onSelect={handleAnswer}
      onNext={async () => {
        const selectedLabel = answers[currentQuestion.id || '']?.[0] || '';
        const nextIndex = getNextQuestionIndex(currentQuestion, selectedLabel);

        await logQuestionFlow('manual_next', {
          selectedOptions: answers[currentQuestion.id || ''] || [],
          selectedLabel,
          nextQuestionIndex: nextIndex,
          nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex]?.order : null
        });

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          await handleComplete();
        }
      }}
      isLastQuestion={currentQuestionIndex === questionSequence.length - 1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};