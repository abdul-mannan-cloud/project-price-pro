import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { Question, CategoryQuestions, Category, QuestionFlow } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskBranch {
  value: string;
  next: string;
  completed?: boolean;
}

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
  const [taskBranches, setTaskBranches] = useState<TaskBranch[]>([]);
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string[]>>({});

  useEffect(() => {
    console.log('Loading questions with description:', projectDescription);
    findMatchingCategory();
  }, [projectDescription]);

  useEffect(() => {
    loadCategoryKeywords();
  }, [categories]);

  const findMatchingCategory = async () => {
    try {
      setIsLoadingQuestions(true);
      console.log('Starting category matching with description:', projectDescription);
      
      const { data: optionsData, error: optionsError } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .maybeSingle();

      if (optionsError) {
        console.error('Error fetching options:', optionsError);
        throw optionsError;
      }

      if (!optionsData) {
        console.error('No options data found');
        throw new Error('No options data found');
      }

      console.log('Fetched options data:', optionsData);

      // Process each category's keywords to find matches
      let bestMatch: { category: string; score: number; matchedKeywords: string[] } | null = null;
      const description = projectDescription.toLowerCase();
      
      // Loop through each category in the options data
      Object.entries(optionsData).forEach(([categoryName, categoryData]) => {
        if (categoryName === 'Key Options') return;
        
        const data = categoryData as any;
        if (!data?.keywords || !Array.isArray(data.keywords)) {
          console.log(`Skipping category ${categoryName}: no keywords found`);
          return;
        }

        let score = 0;
        const matchedKeywords: string[] = [];

        data.keywords.forEach((keyword: string) => {
          const keywordLower = keyword.toLowerCase();
          if (description.includes(keywordLower)) {
            // Higher score for keywords at start of description
            const position = description.indexOf(keywordLower);
            const positionScore = 1 - (position / description.length);
            const matchScore = 1 + positionScore;
            score += matchScore;
            matchedKeywords.push(keyword);

            console.log(`Matched keyword "${keyword}" in category ${categoryName} with score ${matchScore}`);
          }
        });

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          // Find the corresponding category ID
          const matchingCategory = categories.find(
            cat => cat.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (matchingCategory) {
            bestMatch = { 
              category: matchingCategory.id, 
              score,
              matchedKeywords
            };
            console.log(`New best match: ${categoryName} (ID: ${matchingCategory.id}) with score ${score}`);
            console.log('Matched keywords:', matchedKeywords);
          }
        }
      });

      if (bestMatch) {
        console.log('Final best matching category:', bestMatch.category);
        console.log('Final score:', bestMatch.score);
        console.log('Final matched keywords:', bestMatch.matchedKeywords);
        
        // Get the category name for the matched ID
        const matchedCategory = categories.find(cat => cat.id === bestMatch.category);
        const categoryData = optionsData[matchedCategory?.name || ''];
        
        if (categoryData?.questions) {
          const flow: QuestionFlow = {
            category: bestMatch.category,
            questions: categoryData.questions,
            currentQuestionId: categoryData.questions[0]?.id || null,
            answers: {},
            taskBranches: []
          };

          setQuestionFlow(flow);
        } else {
          console.error('No questions found for category:', matchedCategory?.name);
          throw new Error('No questions found for matched category');
        }
      } else {
        console.log('No matching category found');
        toast({
          title: "No matching category found",
          description: "Please select a category manually.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error matching category:', error);
      toast({
        title: "Error",
        description: "Failed to process your description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadCategoryKeywords = async () => {
    try {
      const { data: optionsData, error } = await supabase
        .from('Options')
        .select('*')
        .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
        .single();

      if (error) {
        console.error('Error loading options:', error);
        return;
      }

      // Extract keywords for each category
      const keywords: Record<string, string[]> = {};
      Object.entries(optionsData).forEach(([category, data]) => {
        if (category !== 'Key Options' && data && typeof data === 'object') {
          const categoryData = data as { keywords?: string[] };
          if (categoryData.keywords) {
            // Map the category name to the category ID
            const matchingCategory = categories.find(
              c => c.name.toLowerCase() === category.toLowerCase()
            );
            if (matchingCategory) {
              keywords[matchingCategory.id] = categoryData.keywords;
            }
          }
        }
      });

      setCategoryKeywords(keywords);
    } catch (error) {
      console.error('Error loading category keywords:', error);
    }
  };

  const handleAnswer = (questionId: string, selectedValues: string[], autoAdvance: boolean) => {
    if (!questionFlow) return;

    const currentQuestion = questionFlow.questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    // Update answers
    const newAnswers = {
      ...questionFlow.answers,
      [currentCategory]: {
        ...questionFlow.answers[currentCategory],
        [questionId]: selectedValues
      }
    };

    // Handle task branching for multiple choice questions
    if (currentQuestion.type === 'multiple_choice' && autoAdvance) {
      const newTaskBranches: TaskBranch[] = currentQuestion.options
        .filter(opt => selectedValues.includes(opt.value))
        .map(opt => ({
          value: opt.value,
          next: opt.next || '',
          completed: false
        }));

      if (newTaskBranches.length > 0) {
        setTaskBranches(newTaskBranches);
        const firstBranch = newTaskBranches[0];
        setQuestionFlow(prev => ({
          ...prev!,
          currentQuestionId: firstBranch.next,
          answers: newAnswers,
          taskBranches: newTaskBranches
        }));
        return;
      }
    }

    // Handle navigation for single choice questions
    const selectedOption = currentQuestion.options.find(
      opt => selectedValues.includes(opt.value)
    );

    const nextQuestionId = selectedOption?.next || null;

    if (nextQuestionId === 'NEXT_BRANCH') {
      const nextCategory = findNextCategory();
      if (nextCategory) {
        onSelectAdditionalCategory(nextCategory);
      } else {
        onComplete(newAnswers);
      }
      return;
    }

    if (!nextQuestionId || nextQuestionId === 'END') {
      // Check for remaining task branches
      const currentTaskIndex = taskBranches.findIndex(t => !t.completed);
      if (currentTaskIndex >= 0) {
        const updatedBranches = taskBranches.map((branch, index) => 
          index === currentTaskIndex ? { ...branch, completed: true } : branch
        );
        
        const nextTask = updatedBranches.find((t, i) => i > currentTaskIndex && !t.completed);
        if (nextTask) {
          setTaskBranches(updatedBranches);
          setQuestionFlow(prev => ({
            ...prev!,
            currentQuestionId: nextTask.next,
            answers: newAnswers
          }));
          return;
        }
      }
      
      onComplete(newAnswers);
      return;
    }

    setQuestionFlow(prev => ({
      ...prev!,
      currentQuestionId: nextQuestionId,
      answers: newAnswers
    }));
  };

  const findNextCategory = () => {
    const description = projectDescription.toLowerCase();
    const availableCategories = categories.filter(
      cat => !completedCategories.includes(cat.id)
    );

    let bestMatch = null;
    let highestScore = 0;

    for (const category of availableCategories) {
      const keywords = categoryKeywords[category.id] || [];
      let score = 0;

      keywords.forEach(keyword => {
        if (description.includes(keyword.toLowerCase())) {
          score++;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestMatch = category.id;
      }
    }

    return bestMatch;
  };

  if (isLoadingQuestions) {
    return <LoadingScreen message="Loading questions..." />;
  }

  if (!questionFlow?.currentQuestionId) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">
          No questions available. Please select a category manually.
        </p>
      </div>
    );
  }

  const currentQuestion = questionFlow.questions.find(
    q => q.id === questionFlow.currentQuestionId
  );

  if (!currentQuestion) return null;

  const currentAnswers = questionFlow.answers[currentCategory]?.[currentQuestion.id] || [];

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={currentAnswers}
      onSelect={handleAnswer}
      currentStage={currentQuestion.order || 1}
      totalStages={questionFlow.questions.length}
    />
  );
};

export default QuestionManager;