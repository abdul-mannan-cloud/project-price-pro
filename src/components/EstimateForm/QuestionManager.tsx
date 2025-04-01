import { useEffect, useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { CategoryQuestions, AnswersState } from "@/types/estimate";
import { useQuestionManager } from "@/hooks/useQuestionManager";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {cn} from "@/lib/utils.ts";
import CubeLoader from "../ui/loadingAnimtion";

interface QuestionManagerProps {
    questionSets: CategoryQuestions[];
    onComplete: (answers: AnswersState) => void;
    onProgressChange: (progress: number) => void;
    contractorId: string;
    projectDescription: string;
    uploadedPhotos: string[];
    uploadedImageUrl: string;
    currentStageName: string;
    contractor?: any;
}

export const QuestionManager = ({
                                    questionSets,
                                    onComplete,
                                    onProgressChange,
                                    contractorId,
                                    projectDescription,
                                    uploadedPhotos,
                                    uploadedImageUrl,
                                    currentStageName,
                                    contractor
                                }: QuestionManagerProps) => {
    const {
        currentQuestion,
        currentSet,
        currentSetAnswers,
        isLoadingQuestions,
        isGeneratingEstimate,
        hasFollowUpQuestion,
        currentStage,
        totalStages,
        handleAnswer,
        handleMultipleChoiceNext,
        calculateProgress,
        handleComplete
    } = useQuestionManager(
        questionSets,
        onComplete,
        onProgressChange,
        contractorId,
        projectDescription,
        uploadedPhotos,
        uploadedImageUrl,
        currentStageName
    );

    // New state to track question history and navigation
    const [questionHistory, setQuestionHistory] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Update history when current question changes
    useEffect(() => {
        if (currentQuestion && !questionHistory.some(q => q.id === currentQuestion.id)) {
            setQuestionHistory(prev => [...prev, currentQuestion]);
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [currentQuestion, questionHistory]);

    // Update progress whenever current question changes
    useEffect(() => {
        if (currentQuestion) {
            const progress = calculateProgress();
            onProgressChange(progress);
        }
    }, [currentQuestion, calculateProgress, onProgressChange, currentStageName]);

    // Navigation handlers
    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        // If we're not at the last question in history, just navigate to the next saved question
        if (currentQuestionIndex < questionHistory.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // If we're at the latest question, try to advance to a new question
            const currentAnswer = currentSetAnswers[displayQuestion.id]?.answers || [];
            const hasAnswer = currentAnswer.length > 0;

            // Only proceed if we have an answer for the current question
            if (hasAnswer) {
                if (displayQuestion.type === 'multiple_choice') {
                    handleMultipleChoiceNext();
                } else {
                    // For single choice/radio, we can also try to advance
                    // This is similar to what handleMultipleChoiceNext would do
                    const currentAnswerData = {
                        questionId: displayQuestion.id,
                        answers: currentAnswer
                    };
                    handleComplete(currentAnswerData);
                }
            }
        }
    };

    const isFirstQuestion = currentQuestionIndex === 0;
    const isLatestQuestion = currentQuestionIndex === questionHistory.length - 1;

    // Get the question to display based on navigation
    const displayQuestion = questionHistory[currentQuestionIndex] || currentQuestion;

    if (isLoadingQuestions) {
        return <LoadingScreen message="Loading questions..." />;
    }

    if (isGeneratingEstimate) {
        // return <LoadingScreen message="Building your custom estimate..." isEstimate={true} />;
        return <CubeLoader />
    }

    if (!displayQuestion) {
        return null;
    }

    const isLastQuestion = currentStage === totalStages && !hasFollowUpQuestion && isLatestQuestion;

    return (
        <div className="space-y-6">
            <QuestionCard
                question={displayQuestion}
                selectedAnswers={currentSetAnswers[displayQuestion.id]?.answers || []}
                onSelect={handleAnswer}
                onNext={isLatestQuestion && displayQuestion.type === 'multiple_choice' ? handleMultipleChoiceNext : handleNext}
                isLastQuestion={isLastQuestion}
                currentStage={currentStage}
                totalStages={totalStages}
                hasFollowUpQuestion={hasFollowUpQuestion}
                contractor={contractor}
            />

            <div className="flex justify-between mt-8 px-4 md:px-0">
                <Button
                    variant={isFirstQuestion ? "outline" : "default"}
                    onClick={handlePrevious}
                    disabled={isFirstQuestion}
                    className={cn(
                        "flex items-center gap-2 px-6 py-5 text-base font-medium transition-all duration-200 w-40",
                        isFirstQuestion
                            ? "text-gray-400 border-gray-200"
                            : "bg-primary-100 hover:bg-primary-200 text-primary-700 border-primary-200"
                    )}
                >
                    <ArrowLeft size={20} />
                    Back
                </Button>

                <Button
                    variant="default"
                    onClick={handleNext}
                    disabled={isLatestQuestion && displayQuestion.type !== 'multiple_choice'}
                    className={cn(
                        "flex items-center gap-2 px-6 py-5 text-base font-medium transition-all duration-200 w-40",
                        isLatestQuestion && displayQuestion.type !== 'multiple_choice'
                            ? "bg-gray-200 text-gray-500"
                            : "bg-primary hover:bg-primary-700 text-primary-foreground"
                    )}
                >
                    Continue
                    <ArrowRight size={20} />
                </Button>
            </div>
        </div>
    );
};

export default QuestionManager;