
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Question } from "@/types/estimate";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { VoiceInput } from "./VoiceInput";
import { QuestionOption } from "./QuestionOption";
import { ContinueButton } from "./ContinueButton";

type Contractor = Database['public']['Tables']['contractors']['Row'];

interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[];
  onSelect: (questionId: string, values: string[]) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
  currentStage: number;
  totalStages: number;
  hasFollowUpQuestion?: boolean;
}

export const QuestionCard = ({
  question,
  selectedAnswers = [],
  onSelect,
  onNext,
  isLastQuestion,
  currentStage,
  totalStages,
  hasFollowUpQuestion = true,
}: QuestionCardProps) => {
  const [showNextButton, setShowNextButton] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const questionLoadTime = useRef<number>(0);
  const isMobile = useIsMobile();
  const { contractorId } = useParams();
  const toastRef = useRef<string | null>(null);

  const { data: contractor } = useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", contractorId)
        .single();
      if (error) throw error;
      return data as Contractor;
    },
    enabled: !!contractorId
  });

  useEffect(() => {
    questionLoadTime.current = Date.now();
    setShowNextButton(question.type === 'multiple_choice' ? selectedAnswers.length > 0 : selectedAnswers.length === 1);
    setIsProcessing(false);
  }, [question.id, selectedAnswers]);

  const handleOptionClick = async (value: string) => {
    if (question.type === 'multiple_choice') {
      const newSelection = selectedAnswers.includes(value)
        ? selectedAnswers.filter(v => v !== value)
        : [...selectedAnswers, value];
      onSelect(question.id, newSelection);
    } else {
      if (isProcessing) return;
      setIsProcessing(true);
      onSelect(question.id, [value]);
      
      setTimeout(() => {
        setIsProcessing(false);
        if (onNext) onNext();
      }, 200);
    }
  };

  const shouldShowImage = (option: any) => {
    if (!option.image_url) return false;
    if (option.image_url.includes('example')) return false;
    if (!isNaN(option.value)) return false;
    return true;
  };

  const options = Array.isArray(question?.options) ? question.options : [];

  return (
    <Card className={cn(
      "w-full max-w-6xl mx-auto relative bg-white",
      isMobile ? "px-0 py-4 rounded-none" : "p-6 rounded-xl"
    )}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={cn(
          "font-semibold",
          isMobile ? "text-base px-4" : "text-xl"
        )}>{question?.question}</h2>
        {/*<VoiceInput */}
        {/*  question={question} */}
        {/*  onSelect={(value) => handleOptionClick(value)} */}
        {/*/>*/}
      </div>

      <div className={cn(
        "grid gap-4 mb-12",
        isMobile ? "grid-cols-1 px-4" : question.type === 'multiple_choice' ? "grid-cols-2" : "grid-cols-1"
      )}>
        {options.map((option) => (
          <QuestionOption
            key={option.value}
            option={option}
            isSelected={selectedAnswers.includes(option.value)}
            type={question.type}
            onClick={() => handleOptionClick(option.value)}
            showImage={shouldShowImage(option)}
          />
        ))}
      </div>

      <ContinueButton
        showButton={showNextButton}
        onNext={onNext}
        hasFollowUpQuestion={hasFollowUpQuestion}
        contractor={contractor}
        isMobile={isMobile}
      />
    </Card>
  );
};
