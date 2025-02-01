import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category, QuestionFlow } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { initializeQuestionFlow, updateQuestionFlow } from "@/utils/questionFlowManager";
import { supabase } from "@/integrations/supabase/client";
import { findMatchingQuestionSets, consolidateQuestionSets } from "@/utils/questionSetMatcher";

interface QuestionManagerProps {
  projectDescription: string;
  onComplete: (answers: Record<string, Record<string, string[]>>) => void;
  categories: Category[];
  currentCategory: string;
  onSelectAdditionalCategory: (categoryId: string) => void;
  completedCategories: string[];
}

export const QuestionManager = ({
  projectDescription,
  onComplete,
  categories,
  currentCategory,
  onSelectAdditionalCategory,
  completedCategories,
}: QuestionManagerProps) => {
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [questionFlow, setQuestionFlow] = useState<QuestionFlow | null>(null);
  const [matchedQuestionSets, setMatchedQuestionSets] = useState<CategoryQuestions[]>([]);

  useEffect(() => {
    loadQuestions();
  }, [projectDescription]);

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);

      // Fetch all question sets from Options table
      const { data: optionsData, error: optionsError } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (optionsError) {
        throw optionsError;
      }

      // Convert options data to CategoryQuestions format
      const allQuestionSets: CategoryQuestions[] = Object.entries(optionsData)
        .filter(([key]) => key !== 'Key Options')
        .map(([category, data]) => {
          const questionData = data as any;
          return {
            category,
            keywords: questionData.keywords || [],
            questions: questionData.questions || []
          };
        });

      // Find matching question sets based on project description
      const matches = findMatchingQuestionSets(projectDescription, allQuestionSets);
      
      // Consolidate to prevent question overload
      const consolidatedSets = consolidateQuestionSets(matches);
      setMatchedQuestionSets(consolidatedSets);

      if (consolidatedSets.length === 0) {
        toast({
          title: "No matching categories found",
          description: "Please select a category manually.",
          variant: "destructive",
        });
        return;
      }

      // Initialize question flow with consolidated sets
      const flow = initializeQuestionFlow(consolidatedSets);
      setQuestionFlow(flow);

    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswer = (questionId: string, selectedValues: string[]) => {
    if (!questionFlow) return;

    const currentBranch = questionFlow.branches[questionFlow.currentBranchIndex];
    if (!currentBranch) {
      onComplete(questionFlow.answers);
      return;
    }

    const currentQuestion = currentBranch.questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    // Update question flow based on answer
    const updatedFlow = updateQuestionFlow(questionFlow, selectedValues);
    setQuestionFlow(updatedFlow);

    // Check if we need to move to next branch or complete the flow
    if (updatedFlow.currentBranchIndex >= updatedFlow.branches.length) {
      onComplete(updatedFlow.answers);
    }
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (!questionFlow) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">
          No questions available. Please select a category manually.
        </p>
      </div>
    );
  }

  const currentBranch = questionFlow.branches[questionFlow.currentBranchIndex];
  if (!currentBranch) {
    return null;
  }

  const currentQuestion = currentBranch.questions.find(
    q => q.id === currentBranch.currentQuestionId
  );
  if (!currentQuestion) {
    return null;
  }

  const currentAnswers = questionFlow.answers[currentBranch.category] || {};

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={currentAnswers[currentQuestion.id] || []}
      onSelect={(questionId, values) => handleAnswer(questionId, values)}
      currentStage={questionFlow.currentBranchIndex + 1}
      totalStages={questionFlow.branches.length}
    />
  );
};

export default QuestionManager;