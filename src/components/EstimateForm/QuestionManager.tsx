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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);
  const [showAdditionalServices, setShowAdditionalServices] = useState(false);
  const [selectedAdditionalCategory, setSelectedAdditionalCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // On mount, format and load questions from the provided JSON data.
  useEffect(() => {
    if (categoryData && Array.isArray(categoryData.questions) && categoryData.questions.length > 0) {
      const formattedQuestions: Question[] = categoryData.questions.map((q: any) => {
        return {
          id: q.id, // Use the JSON-provided id
          question: q.question,
          options: Array.isArray(q.options)
            ? q.options.map((opt: any, index: number) => ({
                id: `${q.id}-${index}`,
                label: opt.label,
                value: opt.value,
                next: opt.next,         // Option-level next pointer
                image_url: opt.image_url,
              }))
            : [],
          multi_choice: q.type === "multiple_choice",
          is_branching: q.type === "yes_no" ? false : false, // (Set as needed)
          next: q.next || null, // Question-level next pointer, if any
          sub_questions: {} // (Not used in the current JSON)
        };
      });
      setQuestionSequence(formattedQuestions);
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

  // Determine the next question ID using the JSON-defined "next" pointers.
  const findNextQuestionId = (currentQuestion: Question, selectedValue: string): string | null => {
    const selectedOption = currentQuestion.options.find(
      (opt) => opt.value === selectedValue
    );
    if (selectedOption?.next) {
      return selectedOption.next;
    }
    if (currentQuestion.next) {
      return currentQuestion.next;
    }
    const currentIndex = questionSequence.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex < questionSequence.length - 1) {
      return questionSequence[currentIndex + 1].id;
    }
    return null;
  };

  // Handle an answer selection.
  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptions }));
    const currentQuestion = questionSequence[currentQuestionIndex];
    // For single-choice (non multi-choice) questions, auto-advance.
    if (!currentQuestion.multi_choice) {
      const nextId = findNextQuestionId(currentQuestion, selectedOptions[0]);
      if (!nextId || nextId === "END") {
        handleComplete();
      } else {
        const nextIndex = questionSequence.findIndex((q) => q.id === nextId);
        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }
    }
    // For multi-choice questions, the Continue button in QuestionCard will call onNext.
  };

  // Manual "Next" action for multi-choice questions.
  const handleNext = () => {
    if (currentQuestionIndex < questionSequence.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  // When the question flow is complete, process the answers.
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
      const { data, error } = await supabase.functions.invoke("generate-estimate", {
        body: { 
          answers,
          category: currentCategory,
        },
      });
      if (error) throw error;
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
        categories={categories}
        selectedCategory={selectedAdditionalCategory}
        onSelectCategory={handleAdditionalCategorySelect}
        onComplete={() => onComplete(answers)}
        completedCategories={completedCategories}
      />
    );
  }

  const currentQuestion = questionSequence[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="text-center p-8">No questions available.</div>;
  }
  const isLastQuestion = !findNextQuestionId(currentQuestion, currentQuestion.options[0]?.value || "");
  
  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={isLastQuestion}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};

export default QuestionManager;
