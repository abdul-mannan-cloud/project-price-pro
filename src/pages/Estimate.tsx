import { useState } from "react";
import { StepIndicator } from "@/components/EstimateForm/StepIndicator";
import { QuestionCard } from "@/components/EstimateForm/QuestionCard";

const INITIAL_QUESTIONS = [
  {
    id: "project-type",
    question: "What type of home improvement project are you planning?",
    options: [
      { id: "kitchen", label: "Kitchen Remodel" },
      { id: "bathroom", label: "Bathroom Remodel" },
      { id: "addition", label: "Room Addition" },
      { id: "deck", label: "Deck Construction" },
    ],
  },
  {
    id: "project-size",
    question: "What is the approximate size of your project?",
    options: [
      { id: "small", label: "Small (Under 100 sq ft)" },
      { id: "medium", label: "Medium (100-250 sq ft)" },
      { id: "large", label: "Large (250-500 sq ft)" },
      { id: "xlarge", label: "Extra Large (500+ sq ft)" },
    ],
  },
  {
    id: "timeline",
    question: "When would you like to start this project?",
    options: [
      { id: "immediate", label: "As soon as possible" },
      { id: "1-3months", label: "Within 1-3 months" },
      { id: "3-6months", label: "Within 3-6 months" },
      { id: "6months+", label: "More than 6 months from now" },
    ],
  },
];

const EstimatePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleOptionSelect = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [INITIAL_QUESTIONS[currentStep].id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < INITIAL_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Handle estimate generation
      console.log("Generate estimate with answers:", answers);
    }
  };

  const currentQuestion = INITIAL_QUESTIONS[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-100 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-primary mb-8">
          Project Estimate Calculator
        </h1>
        <StepIndicator
          currentStep={currentStep + 1}
          totalSteps={INITIAL_QUESTIONS.length}
        />
        <QuestionCard
          question={currentQuestion.question}
          options={currentQuestion.options}
          selectedOption={answers[currentQuestion.id] || ""}
          onSelect={handleOptionSelect}
          onNext={handleNext}
          isLastQuestion={currentStep === INITIAL_QUESTIONS.length - 1}
        />
      </div>
    </div>
  );
};

export default EstimatePage;