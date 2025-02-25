import {useEffect} from "react";
import {QuestionCard} from "./QuestionCard";
import {LoadingScreen} from "./LoadingScreen";
import {CategoryQuestions, AnswersState} from "@/types/estimate";
import {useQuestionManager} from "@/hooks/useQuestionManager";

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
                                    contractorId, // Add contractorId as a prop
                                    projectDescription, // Add projectDescription as a prop
                                    uploadedPhotos, // Add uploadedPhotos as a prop
                                    uploadedImageUrl // Ad
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

    } = useQuestionManager(questionSets, onComplete, onProgressChange,contractorId,
        projectDescription,
        uploadedPhotos,
        uploadedImageUrl);

    console.log('QuestionManager state:', {
        currentQuestion,
        currentSet,
        isLoadingQuestions,
        isGeneratingEstimate,
        hasFollowUpQuestion,
        currentStage,
        totalStages,
        currentSetAnswers,
        progress: calculateProgress()
    });

    // Update progress whenever current question changes
    useEffect(() => {
        if (currentQuestion) {
            const progress = calculateProgress();
            onProgressChange(progress);
        }
    }, [currentQuestion, calculateProgress, onProgressChange]);

    if (isLoadingQuestions) {
        return <LoadingScreen message="Loading questions..."/>;
    }

    if (isGeneratingEstimate) {
        return <LoadingScreen message="Building your custom estimate..." isEstimate={true}/>;
    }

    if (!currentQuestion) {
        return <LoadingScreen message="Loading questions..."/>;
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
