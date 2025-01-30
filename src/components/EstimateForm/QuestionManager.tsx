import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { Question, CategoryQuestions } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

interface QuestionManagerProps {
  categoryData: CategoryQuestions;
  onComplete: (answers: Record<string, string[]>) => void;
}

export const QuestionManager = ({ categoryData, onComplete }: QuestionManagerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);

  useEffect(() => {
    console.log('Initializing question sequence with category data:', categoryData);
    if (categoryData?.questions?.length > 0) {
      // Start with just the first question
      setQuestionSequence([categoryData.questions[0]]);
      setCurrentQuestionIndex(0);
      setAnswers({});
    } else {
      toast({
        title: "Error",
        description: "No questions available for this category.",
        variant: "destructive",
      });
    }
  }, [categoryData]);

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    console.log('Handling answer:', { questionId, selectedOptions });
    
    // Update answers
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching && categoryData.branching_logic?.[questionId]) {
      console.log('Processing branching logic for:', questionId);
      const nextQuestionIds = categoryData.branching_logic[questionId][selectedOptions[0]] || [];
      
      if (currentQuestion.sub_questions) {
        const relevantSubQuestions = currentQuestion.sub_questions.filter(q => 
          nextQuestionIds.includes(q.id)
        );
        
        console.log('Relevant sub-questions:', relevantSubQuestions);
        
        // Update sequence with only the relevant sub-questions
        const remainingMainQuestions = categoryData.questions.slice(currentQuestionIndex + 1);
        const newSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          ...relevantSubQuestions,
          ...remainingMainQuestions
        ];
        
        setQuestionSequence(newSequence);
      }
    } else if (currentQuestionIndex === questionSequence.length - 1 && 
               currentQuestionIndex < categoryData.questions.length - 1) {
      // Add the next main question to the sequence
      const nextMainQuestion = categoryData.questions[currentQuestionIndex + 1];
      setQuestionSequence(prev => [...prev, nextMainQuestion]);
    }

    // For non-branching single-choice questions, auto-advance
    if (!currentQuestion.is_branching && !currentQuestion.multi_choice) {
      setTimeout(() => handleNext(), 300);
    }
  };

  const handleNext = () => {
    console.log('Handling next:', { currentQuestionIndex, totalQuestions: questionSequence.length });
    if (currentQuestionIndex < questionSequence.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentQuestionIndex === questionSequence.length - 1) {
      // Check if there are more main questions to add
      const nextMainQuestionIndex = categoryData.questions.findIndex(q => 
        !questionSequence.some(sq => sq.id === q.id)
      );
      
      if (nextMainQuestionIndex !== -1) {
        setQuestionSequence(prev => [...prev, categoryData.questions[nextMainQuestionIndex]]);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        console.log('Completing category with answers:', answers);
        onComplete(answers);
      }
    }
  };

  const currentQuestion = questionSequence[currentQuestionIndex];
  
  if (!currentQuestion) {
    console.log('No current question available');
    return null;
  }

  console.log('Rendering question:', currentQuestion);

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={currentQuestionIndex === questionSequence.length - 1 && 
                     !categoryData.questions.some(q => 
                       !questionSequence.some(sq => sq.id === q.id)
                     )}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};