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
  completedCategories,
}: QuestionManagerProps) => {
  // State for current question (using its ID), collected answers,
  // the sequence of questions, additional services view, and loading/processing flags.
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  // Load questions from the provided categoryData on mount or when it changes.
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        if (!categoryData?.questions?.length) {
          throw new Error("No questions available");
        }
        console.log("Raw category data:", categoryData);
        // Use the questions array from the JSON data.
        setQuestionSequence(categoryData.questions);
        // Start with the first question's id.
        setCurrentQuestionId(categoryData.questions[0].id);
        // Clear any previous answers and additional service view.
        setAnswers({});
        setShowAdditionalServices(false);
      } catch (error) {
        console.error("Error loading questions:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load questions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    if (categoryData) {
      loadQuestions();
    }
  }, [categoryData]);

  // Determine the next question based on the current question and the selected answer.
  const findNextQuestionId = (
    currentQuestion: Question,
    selectedValue: string
  ): string | null => {
    // Look for a matching option that has a "next" property.
    const selectedOption = currentQuestion.options.find(
      (opt) => opt.value === selectedValue
    );
    if (selectedOption?.next) {
      return selectedOption.next;
    }

    // Fallback: if the current question itself has a "next" property, use it.
    if (currentQuestion.next) {
      return currentQuestion.next;
    }

    // If no specific navigation is defined, move to the next question in the sequence.
    const currentIndex = questionSequence.findIndex(
      (q) => q.id === currentQuestion.id
    );
    if (currentIndex < questionSequence.length - 1) {
      return questionSequence[currentIndex + 1].id;
    }
    return null;
  };

  // When an answer is provided, store it and, for single-choice/yes-no, auto-advance.
  const handleAnswer = async (questionId: string, selectedValues: string[]) => {
    const currentQuestion = questionSequence.find((q) => q.id === questionId);
    if (!currentQuestion) return;

    setAnswers((prev) => ({ ...prev, [questionId]: selectedValues }));

    // For single-choice (or yes/no) questions, automatically proceed.
    if (currentQuestion.type !== "multiple_choice") {
      const nextQuestionId = findNextQuestionId(
        currentQuestion,
        selectedValues[0]
      );
      if (!nextQuestionId || nextQuestionId === "END") {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
    // For multiple_choice, the Continue button will trigger handleNextQuestion.
  };

  // When all questions are answered, process the answers.
  const handleComplete = async () => {
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
      // Invoke the generate-estimate function on Supabase.
      const { data, error } = await supabase.functions.invoke(
        "generate-estimate",
        {
          body: {
            answers,
            category: currentCategory,
          },
        }
      );

      if (error) throw error;

      // Update the lead with the generated estimate.
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          estimate_data: data,
          estimated_cost: data.totalCost,
        })
        .eq("category", currentCategory)
        .is("user_email", null);

      if (updateError) throw updateError;

      // After processing, show additional services.
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

  // Handle selection of an additional service category.
  const handleAdditionalCategorySelect = (categoryId: string) => {
    setSelectedAdditionalCategory(categoryId);
    onSelectAdditionalCategory(categoryId);
  };

  // Function to advance to the next question (used for multiple_choice questions).
  const handleNextQuestion = async () => {
    const currentQuestion = questionSequence.find(
      (q) => q.id === currentQuestionId
    );
    if (!currentQuestion) return;

    // Only process manual advancement for multiple_choice questions.
    if (currentQuestion.type === "multiple_choice") {
      const selected = answers[currentQuestion.id] || [];
      if (selected.length === 0) return;
      const nextQuestionId = findNextQuestionId(currentQuestion, selected[0]);
      if (!nextQuestionId || nextQuestionId === "END") {
        await handleComplete();
      } else {
        setCurrentQuestionId(nextQuestionId);
      }
    }
  };

  // Render a loading screen while questions are being loaded.
  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  // Render a processing/loading screen if we're processing an action.
  if (isProcessing) {
    return <LoadingScreen message="Processing your answers..." />;
  }

  // Once answers are processed, show the additional services grid.
  if (showAdditionalServices) {
    return (
      <AdditionalServicesGrid
        categories={categories}
        selectedCategory={selectedAdditionalCategory}
        onSelect={handleAdditionalCategorySelect}
        onComplete={() => onComplete(answers)}
        completedCategories={completedCategories}
      />
    );
  }

  // Find the current question based on its ID.
  const currentQuestion = currentQuestionId
    ? questionSequence.find((q) => q.id === currentQuestionId)
    : null;

  if (!currentQuestion) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-gray-600">
          No questions available. Please try selecting a different category.
        </p>
      </div>
    );
  }

  // Determine if the current question is the last in the sequence.
  const isLastQuestion =
    !findNextQuestionId(currentQuestion, "yes") ||
    currentQuestion.next === "END" ||
    questionSequence.indexOf(currentQuestion) === questionSequence.length - 1;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNextQuestion}
      isLastQuestion={isLastQuestion}
      currentStage={currentQuestion.order}
      totalStages={questionSequence.length}
    />
  );
};
