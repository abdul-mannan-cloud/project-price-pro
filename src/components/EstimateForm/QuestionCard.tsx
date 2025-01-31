import { useEffect, useState } from "react";
import { Question } from "@/types/estimate";

interface QuestionCardProps {
  question: Question;
  selectedOptions: string[];
  onSelect: (questionId: string, selectedOptions: string[], selectedLabel: string) => Promise<void>;
  onNext: () => void;
  isLastQuestion: boolean;
  currentStage: number;
  totalStages: number;
}

export const QuestionCard = ({ 
  question,
  selectedOptions,
  onSelect,
  onNext,
  isLastQuestion,
  currentStage,
  totalStages
}: QuestionCardProps) => {
  const [showNextButton, setShowNextButton] = useState(false);
  const options = question.options || [];
  const isYesNoQuestion = question.selections?.length === 2 && 
                         question.selections[0] === 'Yes' && 
                         question.selections[1] === 'No';

  useEffect(() => {
    if (question.multi_choice) {
      setShowNextButton(selectedOptions.length > 0);
    } else if (!isYesNoQuestion) {
      setShowNextButton(selectedOptions.length === 1);
    } else {
      setShowNextButton(false);
    }
  }, [selectedOptions, question.multi_choice, isYesNoQuestion]);

  const handleSingleOptionSelect = async (value: string, label: string) => {
    const newSelection = [value];
    await onSelect(question.id || '', newSelection, label);
  };

  return (
    <div className="question-card">
      <h2 className="text-lg font-semibold">{question.question}</h2>
      <div className="options">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => handleSingleOptionSelect(option.id || '', option.label)}
            className={`option-button ${selectedOptions.includes(option.id || '') ? 'selected' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {showNextButton && (
        <button onClick={onNext} className="next-button">
          {isLastQuestion ? 'Finish' : 'Next'}
        </button>
      )}
      <div className="progress">
        <span>{currentStage} of {totalStages}</span>
      </div>
    </div>
  );
};
