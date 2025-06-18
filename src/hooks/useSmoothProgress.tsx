import { useState, useEffect, useRef } from "react";
import { Question, QuestionAnswer } from "@/types/estimate";
import { calculateQuestionProgress } from "@/utils/questionNavigation";

/**
 * Custom hook to manage progress with smooth transitions
 */
export const useSmoothProgress = (
  questions: Question[],
  currentQuestionId: string | null,
  answers: Record<string, QuestionAnswer>,
  totalQuestionSets: number,
  currentSetIndex: number = 0,
) => {
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate the target progress whenever inputs change
  useEffect(() => {
    if (!currentQuestionId || !questions.length) {
      setTargetProgress(currentSetIndex * (100 / totalQuestionSets));
      return;
    }

    const calculatedProgress = calculateQuestionProgress(
      questions,
      currentQuestionId,
      answers,
      totalQuestionSets,
      currentSetIndex,
    );

    setTargetProgress(calculatedProgress);
  }, [
    questions,
    currentQuestionId,
    answers,
    totalQuestionSets,
    currentSetIndex,
  ]);

  // Animate the progress to avoid jarring jumps
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animateProgress = () => {
      setDisplayedProgress((prev) => {
        // Calculate a smooth transition between current and target progress
        const newProgress = prev + (targetProgress - prev) * 0.1;

        // If we're very close to the target, just set it to avoid tiny increments
        if (Math.abs(newProgress - targetProgress) < 0.5) {
          return targetProgress;
        }

        // Continue animation if not at target
        if (prev !== targetProgress) {
          animationFrameRef.current = requestAnimationFrame(animateProgress);
        }

        return newProgress;
      });
    };

    animationFrameRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetProgress]);

  return {
    progress: displayedProgress,
    rawProgress: targetProgress,
  };
};
