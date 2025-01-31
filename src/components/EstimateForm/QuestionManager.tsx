import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AdditionalServicesGrid } from "./AdditionalServicesGrid";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Utility functions to find next question correctly
const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedAnswer: string | undefined
): number => {
  if (!currentQuestion) return -1;

  let nextOrder: number | undefined = undefined;

  if (currentQuestion.is_branching) {
    if (selectedAnswer === "Yes") {
      nextOrder = currentQuestion.next_question;
    } else if (selectedAnswer === "No") {
      nextOrder = currentQuestion.next_if_no;
    }
  } else {
    nextOrder = currentQuestion.next_question;
  }

  if (nextOrder !== undefined) {
    const nextIndex = questions.findIndex(q => q.order === nextOrder);
    if (nextIndex !== -1) return nextIndex;
  }

  // Fallback: Find the next available question in sequence
  let fallbackOrder = (currentQuestion.order || 0) + 1;
  while (questions.findIndex(q => q.order === fallbackOrder) === -1 && fallbackOrder < questions.length) {
    fallbackOrder++;
  }

  return questions.findIndex(q => q.order === fallbackOrder);
};

// Function to initialize questions
const initializeQuestions = (questions: Question[]): Question[] => {
  return [...questions]
    .filter(q => typeof q.order === "number")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

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
      const questions = initializeQuestions(categoryData.questions);
      console.log("Initialized questions:", questions);
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

  const handleAnswer = async (questionId: string, selectedOptions: string[]) => {
    const currentQuestion = questionSequence[currentQuestionIndex];
    const selectedAnswer = selectedOptions[0];
    const updatedAnswers = { ...answers, [questionId]: selectedOptions };

    console.log("Processing answer:", {
      currentOrder: currentQuestion.order,
      question: currentQuestion.question,
      answer: selectedAnswer,
      nextIfYes: currentQuestion.next_question,
      nextIfNo: currentQuestion.next_if_no
    });

    setAnswers(updatedAnswers);

    try {
      const { error } = await supabase
        .from("leads")
        .insert({
          category: currentCategory,
          answers: updatedAnswers,
          contractor_id: null,
          user_name: "",
          user_email: "",
          user_phone: "",
          status: "new"
        });

      if (error) throw error;

      const nextIndex = findNextQuestionIndex(questionSequence, currentQuestion, selectedAnswer);

      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        console.log("No more questions found, completing sequence");
        await handleComplete();
      }

    } catch (error) {
      console.error("Error saving answer:", error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    console.log("Completing category with answers:", answers);
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
      const { data, error } = await supabase.functions.invoke("generate-estimate", {
        body: { 
          answers,
          category: currentCategory
        }
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("leads")
        .update({ estimate_data: data })
        .eq("category", currentCategory)
        .is("user_email", null);

      if (updateError) throw updateError;

      setShowAdditionalServices(true);
    } catch (error) {
      console.error("Error processing answers:", error);
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
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={() => {
        const nextIndex = findNextQuestionIndex(
          questionSequence,
          currentQuestion,
          answers[currentQuestion.id]?.[0]
        );

        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          handleComplete();
        }
      }}
      isLastQuestion={
        !currentQuestion.next_question && 
        findNextQuestionIndex(questionSequence, currentQuestion, answers[currentQuestion.id]?.[0]) === -1
      }
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};
