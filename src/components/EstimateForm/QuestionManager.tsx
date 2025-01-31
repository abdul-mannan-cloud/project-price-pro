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

  const logQuestionFlow = async (event: string, details: any) => {
    try {
      const currentQuestion = questionSequence[currentQuestionIndex];
      
      // Enhanced logging for debugging
      console.log('Question Flow Event:', {
        event,
        currentQuestion: {
          id: currentQuestion?.id,
          order: currentQuestion?.order,
          question: currentQuestion?.question,
          next_question: currentQuestion?.next_question,
          next_if_no: currentQuestion?.next_if_no,
          selections: currentQuestion?.selections,
          is_branching: currentQuestion?.selections?.length === 2 && 
                       currentQuestion?.selections[0] === 'Yes' && 
                       currentQuestion?.selections[1] === 'No',
          multi_choice: currentQuestion?.multi_choice
        },
        selectedOptions: details.selectedOptions,
        selectedLabel: details.selectedLabel,
        category: currentCategory,
        answers,
        questionSequence: questionSequence.map(q => ({
          order: q.order,
          question: q.question,
          next_question: q.next_question,
          next_if_no: q.next_if_no
        }))
      });

      // Format answers for logging and storage
      const formattedAnswers = Object.entries(answers).reduce((acc, [qId, values]) => {
        const question = questionSequence.find(q => q.id === qId);
        if (question) {
          acc[question.question] = values.map(v => {
            const option = question.options?.find(opt => opt.id === v);
            return option?.label || v;
          });
        }
        return acc;
      }, {} as Record<string, string[]>);

      // Log to Supabase function
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
          answers: formattedAnswers,
          selectedOptions: details.selectedOptions,
          selectedLabel: details.selectedLabel
        }
      });

      // Save answers to leads table after each question
      if (Object.keys(answers).length > 0) {
        const { error: leadError } = await supabase
          .from('leads')
          .upsert({
            category: currentCategory,
            answers: formattedAnswers,
            project_title: `${currentCategory} Project`,
            status: 'in_progress'
          }, {
            onConflict: 'category'
          });

        if (leadError) {
          console.error('Error saving answers to leads:', leadError);
        }
      }

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
          next_if_no: q.next_if_no
        }))
      });
      
      setQuestionSequence(sortedQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowAdditionalServices(false);
      
      logQuestionFlow('sequence_initialized', {
        category: currentCategory,
        questions: sortedQuestions
      });
    }
  }, [categoryData, currentCategory]);

  const findNextQuestionIndex = (currentQuestion: Question, selectedLabel: string): number => {
    if (!currentQuestion) return -1;

    const isYesNoQuestion = currentQuestion.selections?.length === 2 && 
                           currentQuestion.selections[0] === 'Yes' && 
                           currentQuestion.selections[1] === 'No';
    
    console.log('Finding next question:', {
      currentOrder: currentQuestion.order,
      selectedLabel,
      nextQuestion: currentQuestion.next_question,
      nextIfNo: currentQuestion.next_if_no,
      isYesNo: isYesNoQuestion
    });

    // For Yes/No questions, strictly follow the navigation rules
    if (isYesNoQuestion) {
      if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_if_no);
        console.log('No selected - navigating to:', {
          currentOrder: currentQuestion.order,
          nextIfNo: currentQuestion.next_if_no,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
      
      if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
        const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
        console.log('Yes selected - navigating to:', {
          currentOrder: currentQuestion.order,
          nextQuestion: currentQuestion.next_question,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
    }

    // For non-Yes/No questions with explicit next_question
    if (typeof currentQuestion.next_question === 'number') {
      const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.next_question);
      console.log('Following explicit next_question:', {
        currentOrder: currentQuestion.order,
        nextQuestion: currentQuestion.next_question,
        foundIndex: nextIndex
      });
      return nextIndex;
    }

    // If next_question is explicitly null, we've reached the end
    if (currentQuestion.next_question === null) {
      console.log('Reached end of questions');
      return -1;
    }

    // Sequential navigation as fallback
    const nextIndex = questionSequence.findIndex(q => q.order === currentQuestion.order + 1);
    console.log('Using sequential navigation:', {
      currentOrder: currentQuestion.order,
      nextOrder: currentQuestion.order + 1,
      foundIndex: nextIndex
    });
    return nextIndex;
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[], selectedLabel: string) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    
    console.log('Handling answer:', {
      questionId,
      selectedOptions,
      selectedLabel,
      currentQuestion: {
        order: currentQuestion?.order,
        question: currentQuestion?.question,
        next_question: currentQuestion?.next_question,
        next_if_no: currentQuestion?.next_if_no
      }
    });

    const updatedAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(updatedAnswers);

    await logQuestionFlow('answer_received', {
      selectedOptions,
      selectedLabel,
      currentAnswers: updatedAnswers
    });
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
        const nextIndex = findNextQuestionIndex(currentQuestion, selectedLabel);
        
        await logQuestionFlow('manual_next', {
          currentOrder: currentQuestion.order,
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
      isLastQuestion={questionSequence[currentQuestionIndex]?.next_question === null}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};