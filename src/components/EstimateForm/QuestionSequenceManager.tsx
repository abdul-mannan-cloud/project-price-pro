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

  useEffect(() => {
    setQuestionSequence([{
      currentQuestion: initialQuestion,
      questionId: "initial",
      depth: 0
    }]);
  }, [initialQuestion]);

  const findSubQuestions = (
    question: CategoryQuestion | SubQuestion,
    selectedValue: string
  ): SubQuestion[] => {
    if (!question.sub_questions) return [];
    
    if (question.sub_questions[selectedValue]) {
      return question.sub_questions[selectedValue];
    }

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

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: selectedOptions
    }));

    if (currentQuestion.currentQuestion.is_branching) {
      let newQuestions: QuestionSequence[] = [];

      selectedOptions.forEach(option => {
        const subQuestions = findSubQuestions(currentQuestion.currentQuestion, option);
        console.log('Found sub-questions for option:', option, subQuestions);

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
        setQuestionSequence(prev => [
          ...prev.slice(0, currentIndex + 1),
          ...newQuestions,
          ...prev.slice(currentIndex + 1)
        ]);
        setCurrentIndex(prev => prev + 1);
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

  // Convert the current question to match the Question interface
  const currentQuestion: Question = {
    ...questionSequence[currentIndex].currentQuestion,
    id: questionSequence[currentIndex].questionId,
    options: questionSequence[currentIndex].currentQuestion.selections.map((selection, index) => ({
      id: typeof selection === 'string' ? `${index}` : selection.value,
      label: typeof selection === 'string' ? selection : selection.label,
      value: typeof selection === 'string' ? selection : selection.value
    }))
  };

  return (
    <QuestionCard
      question={currentQuestion}
      selectedOptions={answers[questionSequence[currentIndex].questionId] || []}
      onSelect={(_, value) => handleAnswer(value)}
      onNext={handleNext}
      isLastQuestion={currentIndex === questionSequence.length - 1}
      currentStage={currentIndex + 1}
      totalStages={questionSequence.length}
    />
  );
};