import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { Question, CategoryQuestions, BranchingLogic } from "@/types/estimate";

interface QuestionManagerProps {
  categoryData: CategoryQuestions;
  onComplete: (answers: Record<string, string[]>) => void;
}

export const QuestionManager = ({ categoryData, onComplete }: QuestionManagerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionSequence, setQuestionSequence] = useState<Question[]>([]);

  useEffect(() => {
    setQuestionSequence(categoryData.questions);
  }, [categoryData]);

  const handleAnswer = (questionId: string, selectedOptions: string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptions }));

    if (categoryData.branching_logic[questionId]) {
      const nextQuestions = categoryData.branching_logic[questionId][selectedOptions[0]] || [];
      const currentQuestion = questionSequence[currentQuestionIndex];
      
      if (currentQuestion.is_branching) {
        const subQuestions = currentQuestion.sub_questions || [];
        const filteredSubQuestions = subQuestions.filter(q => 
          nextQuestions.includes(q.id)
        );
        
        const newSequence = [
          ...questionSequence.slice(0, currentQuestionIndex + 1),
          ...filteredSubQuestions,
          ...questionSequence.slice(currentQuestionIndex + 1)
        ];
        
        setQuestionSequence(newSequence);
      }
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