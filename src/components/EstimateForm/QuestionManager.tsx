import {useEffect} from "react";
import {QuestionCard} from "./QuestionCard";
import {LoadingScreen} from "./LoadingScreen";
import {CategoryQuestions, AnswersState} from "@/types/estimate";
import {useQuestionManager} from "@/hooks/useQuestionManager";
import { toast } from "@/hooks/use-toast";

interface QuestionManagerProps {
    questionSets: CategoryQuestions[];
    onComplete: (answers: AnswersState) => void;
    onProgressChange: (progress: number) => void;
    contractorId: string;
    projectDescription: string;
    uploadedPhotos: string[];
    uploadedImageUrl: string;
}

export const QuestionManager = ({
                                    questionSets,
                                    onComplete,
                                    onProgressChange,
                                    contractorId,
                                    projectDescription,
                                    uploadedPhotos,
                                    uploadedImageUrl
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
    } = useQuestionManager(questionSets, onComplete, onProgressChange,contractorId,
        projectDescription,
        uploadedPhotos,
        uploadedImageUrl);

    // Update progress whenever current question changes
    useEffect(() => {
        if (currentQuestion) {
            const progress = calculateProgress();
            onProgressChange(progress);
        }
    }, [currentQuestion, calculateProgress, onProgressChange]);

    // Handle the case when currentQuestion is null
    useEffect(() => {
        if (!isLoadingQuestions && !isGeneratingEstimate && !currentQuestion) {
            // Show error toast
            toast({
                title: "Success",
                description: "No More questions found. Starting estimate process.",
                variant: "destructive",
            });
            // Start the estimate process by calling onComplete with current answers
            handleComplete();
        }
    }, [currentQuestion, isLoadingQuestions, isGeneratingEstimate, currentSetAnswers, onComplete]);

    if (isLoadingQuestions) {
        return <LoadingScreen message="Loading questions..."/>;
    }

    if (isGeneratingEstimate) {
        return <LoadingScreen message="Building your custom estimate..." isEstimate={true}/>;
    }

    if (!currentQuestion) {
        // Instead of showing a loading screen, we'll return null
        // The useEffect above will handle showing the toast and starting the estimate
        return null;
    }

    const isLastQuestion = currentStage === totalStages && !hasFollowUpQuestion;

    return (
        <QuestionCard
            question={currentQuestion}
            selectedAnswers={currentSetAnswers[currentQuestion.id]?.answers || []}
            onSelect={handleAnswer}
            onNext={currentQuestion.type === 'multiple_choice' ? handleMultipleChoiceNext : undefined}
            isLastQuestion={isLastQuestion}
            currentStage={currentStage}
            totalStages={totalStages}
            hasFollowUpQuestion={hasFollowUpQuestion}
        />
    );
};

export default QuestionManager;