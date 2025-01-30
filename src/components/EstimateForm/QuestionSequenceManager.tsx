import { useState, useEffect } from "react";
import { CategoryQuestion, QuestionSequence, SubQuestion } from "@/types/questions";
import { Question } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";
import { QuestionCard } from "./QuestionCard";

interface QuestionSequenceManagerProps {
  initialQuestion: CategoryQuestion;
  onComplete: (answers: Record<string, string[]>) => void;
}

export const QuestionSequenceManager = ({
  initialQuestion,
  onComplete
}: QuestionSequenceManagerProps) => {
  const [questionSequence, setQuestionSequence] = useState<QuestionSequence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    setQuestionSequence([{
      currentQuestion: initialQuestion,
      questionId: "initial",
      depth: 0
    }]);
    calculateTotalQuestions(initialQuestion);
  }, [initialQuestion]);

  const calculateTotalQuestions = (question: CategoryQuestion | SubQuestion) => {
    let count = 1;
    
    if (question.sub_questions) {
      Object.values(question.sub_questions).forEach(subQuestions => {
        subQuestions.forEach(sq => {
          count += calculateTotalQuestions(sq);
        });
      });
    }
    
    setTotalQuestions(count);
    return count;
  };

  const findSubQuestions = (
    question: CategoryQuestion | SubQuestion,
    selectedValue: string
  ): SubQuestion[] => {
    if (!question.sub_questions) return [];
    
    // First try direct match with the value
    if (question.sub_questions[selectedValue]) {
      return question.sub_questions[selectedValue];
    }

    // If not found, try to match with the value property of selection objects
    const selections = question.selections as any[];
    const matchingOption = selections.find(opt => 
      (typeof opt === 'string' ? opt : opt.value) === selectedValue
    );

    if (matchingOption && question.sub_questions[matchingOption.value]) {
      return question.sub_questions[matchingOption.value];
    }

    return [];
  };

  const handleAnswer = (selectedOptions: string[]) => {
    const currentQuestion = questionSequence[currentIndex];
    console.log('Handling answer:', { currentQuestion, selectedOptions });

    // Save the answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: selectedOptions
    }));

    if (currentQuestion.currentQuestion.is_branching) {
      let newQuestions: QuestionSequence[] = [];

      // For each selected option in a branching question
      selectedOptions.forEach(option => {
        const subQuestions = findSubQuestions(currentQuestion.currentQuestion, option);
        console.log('Found sub-questions for option:', option, subQuestions);

        // Add each sub-question to the sequence
        subQuestions.forEach((sq, index) => {
          newQuestions.push({
            currentQuestion: sq,
            parentValue: option,
            questionId: `${currentQuestion.questionId}-${option}-${index}`,
            depth: currentQuestion.depth + 1
          });
        });
      });

      if (newQuestions.length > 0) {
        const updatedSequence = [
          ...questionSequence.slice(0, currentIndex + 1),
          ...newQuestions,
          ...questionSequence.slice(currentIndex + 1)
        ];
        setQuestionSequence(updatedSequence);
        setCurrentIndex(prev => prev + 1);
        
        // Update total questions count
        setTotalQuestions(Math.max(totalQuestions, updatedSequence.length));
      } else {
        handleNext();
      }
    } else if (!currentQuestion.currentQuestion.multi_choice) {
      setTimeout(() => handleNext(), 300);
    }
  };

  const handleNext = () => {
    if (currentIndex === questionSequence.length - 1) {
      handleComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    if (Object.keys(answers).length === 0) {
      toast({
        title: "Error",
        description: "Please answer at least one question before continuing.",
        variant: "destructive",
      });
      return;
    }
    onComplete(answers);
  };

  if (!questionSequence[currentIndex]) {
    return null;
  }

  const currentQuestion: Question = {
    id: questionSequence[currentIndex].questionId,
    question: questionSequence[currentIndex].currentQuestion.question,
    description: questionSequence[currentIndex].currentQuestion.description,
    selections: questionSequence[currentIndex].currentQuestion.selections,
    options: questionSequence[currentIndex].currentQuestion.selections.map((selection, index) => ({
      id: typeof selection === 'string' ? `${index}` : selection.value || selection.id || `${index}`,
      label: typeof selection === 'string' ? selection : selection.label,
      value: typeof selection === 'string' ? selection : selection.value
    })),
    is_branching: questionSequence[currentIndex].currentQuestion.is_branching,
    multi_choice: questionSequence[currentIndex].currentQuestion.multi_choice,
    sub_questions: questionSequence[currentIndex].currentQuestion.sub_questions
  };

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[questionSequence[currentIndex].questionId] || []}
      onSelect={(_, value) => handleAnswer(value)}
      onNext={handleNext}
      isLastQuestion={currentIndex === questionSequence.length - 1}
      currentStage={currentIndex + 1}
      totalStages={totalQuestions}
    />
  );
};