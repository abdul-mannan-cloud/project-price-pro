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

  const findNextQuestionByOrder = (targetOrder: number): number => {
    console.log('Finding question with order:', targetOrder);
    const nextIndex = questionSequence.findIndex(q => q.order === targetOrder);
    console.log('Found question index:', nextIndex);
    return nextIndex;
  };

  const logQuestionFlow = async (event: string, details: any) => {
    try {
      const currentQuestion = questionSequence[currentQuestionIndex];
      
      console.log('Question Flow Event:', {
        timestamp: new Date().toISOString(),
        event,
        currentQuestion: {
          order: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          is_branching: currentQuestion?.selections?.length === 2 && 
                       currentQuestion?.selections[0] === 'Yes' && 
                       currentQuestion?.selections[1] === 'No',
          multi_choice: currentQuestion?.multi_choice
        },
        selectedOptions: details.selectedOptions,
        selectedLabel: details.selectedLabel,
        nextQuestion: details.nextQuestion
      });

      await supabase.functions.invoke('log-question-flow', {
        body: {
          event,
          questionId: currentQuestion?.id,
          questionOrder: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          is_branching: currentQuestion?.selections?.length === 2 && 
                       currentQuestion?.selections[0] === 'Yes' && 
                       currentQuestion?.selections[1] === 'No',
          multi_choice: currentQuestion?.multi_choice,
          category: currentCategory,
          selectedOptions: details.selectedOptions,
          selectedLabel: details.selectedLabel
        }
      });
    } catch (error) {
      console.error('Error logging question flow:', error);
    }
  };

  useEffect(() => {
    if (categoryData?.questions?.length > 0) {
      // Sort questions by order to ensure proper sequence
      const sortedQuestions = [...categoryData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Initializing questions for category:', {
        category: currentCategory,
        questions: sortedQuestions.map(q => ({
          order: q.order,
          question: q.question,
          next_question: q.next_question,
          next_if_no: q.next_if_no
        }))
      });
      
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
      
      logQuestionFlow('sequence_initialized', {
        selectedOptions: [],
        selectedLabel: '',
        questions: sortedQuestions
      });
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
        next_if_no: currentQuestion.next_if_no
      }
    });

    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(updatedAnswers);

    // Determine next question based on answer
    const isYesNoQuestion = currentQuestion.selections?.length === 2 && 
                           currentQuestion.selections[0] === 'Yes' && 
                           currentQuestion.selections[1] === 'No';

    let nextIndex = -1;
    
    if (isYesNoQuestion) {
      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        // For "No" answers, use next_if_no to find the next question by order
        nextIndex = findNextQuestionByOrder(currentQuestion.next_if_no);
        console.log(`No selected - navigating to order ${currentQuestion.next_if_no}, found at index ${nextIndex}`);
      } else if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
        // For "Yes" answers, use next_question to find the next question by order
        nextIndex = findNextQuestionByOrder(currentQuestion.next_question);
        console.log(`Yes selected - navigating to order ${currentQuestion.next_question}, found at index ${nextIndex}`);
      }
    } else if (typeof currentQuestion.next_question === 'number') {
      // For non-branching questions, always use next_question
      nextIndex = findNextQuestionByOrder(currentQuestion.next_question);
      console.log(`Following next_question order ${currentQuestion.next_question}, found at index ${nextIndex}`);
    }

    await logQuestionFlow('answer_processed', {
      selectedOptions,
      selectedLabel,
      nextQuestionIndex: nextIndex,
      nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex]?.order : null
    });

    if (nextIndex !== -1 && nextIndex < questionSequence.length) {
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
      question={questionSequence[currentQuestionIndex]}
      selectedOptions={answers[questionSequence[currentQuestionIndex]?.id || ''] || []}
      onSelect={handleAnswer}
      onNext={async () => {
        const currentQuestion = questionSequence[currentQuestionIndex];
        const selectedLabel = answers[currentQuestion.id || '']?.[0] || '';
        const isYesNoQuestion = currentQuestion.selections?.length === 2 && 
                               currentQuestion.selections[0] === 'Yes' && 
                               currentQuestion.selections[1] === 'No';
        
        let nextIndex = -1;
        
        if (isYesNoQuestion) {
          if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
            nextIndex = findNextQuestionByOrder(currentQuestion.next_if_no);
            console.log(`Manual next - No selected, going to order ${currentQuestion.next_if_no}`);
          } else if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
            nextIndex = findNextQuestionByOrder(currentQuestion.next_question);
            console.log(`Manual next - Yes selected, going to order ${currentQuestion.next_question}`);
          }
        } else if (typeof currentQuestion.next_question === 'number') {
          nextIndex = findNextQuestionByOrder(currentQuestion.next_question);
          console.log(`Manual next - following next_question order ${currentQuestion.next_question}`);
        }

        await logQuestionFlow('manual_next', {
          selectedOptions: answers[currentQuestion.id || ''] || [],
          selectedLabel,
          nextQuestionIndex: nextIndex,
          nextQuestionOrder: nextIndex !== -1 ? questionSequence[nextIndex]?.order : null
        });

        if (nextIndex !== -1 && nextIndex < questionSequence.length) {
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