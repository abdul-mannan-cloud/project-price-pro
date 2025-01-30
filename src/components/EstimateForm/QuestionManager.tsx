import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { Question, CategoryQuestions } from "@/types/estimate";

interface QuestionManagerProps {
  categoryData: CategoryQuestions;
  onComplete: (answers: Record<string, string[]>) => void;
}

export const QuestionManager = ({ categoryData, onComplete }: QuestionManagerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);

  useEffect(() => {
    // Initialize with only the first question
    setQuestionSequence([categoryData.questions[0]]);
  }, [categoryData]);

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    const currentQuestion = questionSequence[currentQuestionIndex];
    
    if (currentQuestion.is_branching && categoryData.branching_logic[questionId]) {
      const nextQuestionIds = categoryData.branching_logic[questionId][selectedOptions[0]] || [];
      
      if (currentQuestion.sub_questions) {
        const relevantSubQuestions = currentQuestion.sub_questions.filter(q => 
          nextQuestionIds.includes(q.id)
        );
        
        // Update sequence with only the relevant sub-questions
        const newSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          ...relevantSubQuestions,
          ...categoryData.questions.slice(1) // Add remaining main questions
        ];
        
        setQuestionSequence(newSequence);
      }
    } else if (currentQuestionIndex === questionSequence.length - 1 && 
               currentQuestionIndex < categoryData.questions.length - 1) {
      // If we're at the last question in our sequence but there are more main questions,
      // add the next main question
      setQuestionSequence(prev => [...prev, categoryData.questions[prev.length]]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionSequence.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  };

  const currentQuestion = questionSequence[currentQuestionIndex];
  
  if (!currentQuestion) return null;

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[currentQuestion.id] || []}
      onSelect={handleAnswer}
      onNext={handleNext}
      isLastQuestion={currentQuestionIndex === questionSequence.length - 1}
      currentStage={currentQuestionIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};