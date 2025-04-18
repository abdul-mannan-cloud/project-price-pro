import { useEffect, useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { LoadingScreen } from "./LoadingScreen";
import { CategoryQuestions, AnswersState } from "@/types/estimate";
import { useQuestionManager } from "@/hooks/useQuestionManager";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CubeLoader from "../ui/loadingAnimtion";

interface QuestionManagerProps {
    questionSets: CategoryQuestions[];
    onComplete: (answers: AnswersState, leadId: string) => void;
    onProgressChange: (progress: number) => void;
    contractorId: string;
    projectDescription: string;
    uploadedPhotos: string[];
    uploadedImageUrl: string | null;
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
        handleSingleChoiceNavigation,
        handleMultipleChoiceNext,
        handleCameraMeasurementNext,
        handleTextInputNext,
        handleNumberInputNext,
        handleYesNoNext,
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
    const [isMeasurementInputReady, setIsMeasurementInputReady] = useState(false);
    const [nextButtonDisabled, setNextButtonDisabled] = useState(true);

    // Update history when current question changes
    useEffect(() => {
        if (currentQuestion && !questionHistory.some(q => q.id === currentQuestion.id)) {
            setQuestionHistory(prev => [...prev, currentQuestion]);
            setCurrentQuestionIndex(prev => prev + 1);
            // Reset measurement input readiness when a new question is added
            setIsMeasurementInputReady(false);
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

    // Update next button state based on current answers
    useEffect(() => {
        if (displayQuestion) {
            if ((currentSetAnswers[displayQuestion?.id]?.answers || []).length > 0) {
                setNextButtonDisabled(false);
            }
        }
    }, [currentSetAnswers]);

    const handleNext = () => {
        console.log("INTO THE HANDLE NEXT OR CONTINUE");
        
        // If we're not at the last question in history, just navigate to the next saved question
        if (currentQuestionIndex < questionHistory.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // If we're at the latest question, try to advance to a new question
            const currentAnswer = currentSetAnswers[displayQuestion.id]?.answers || [];
            let hasAnswer = currentAnswer.length > 0;
    
            if ((displayQuestion.type !== 'single_choice' && displayQuestion.type !== 'multiple_choice')) {
                hasAnswer = true;
            }
    
            // Only proceed if we have an answer for the current question
            if (hasAnswer) {
                switch (displayQuestion.type) {
                    case 'single_choice':
                        // For single_choice, we need to explicitly call handleSingleChoiceNavigation
                        // since it's no longer being called in handleAnswer
                        handleSingleChoiceNavigation(displayQuestion, currentAnswer[0]);
                        break;
                    case 'multiple_choice':
                        handleMultipleChoiceNext();
                        break;
                    case 'camera_measurement':
                        console.log("Handling camera measurements");
                        handleCameraMeasurementNext();
                        break;
                    case 'text_input':
                        handleTextInputNext();
                        break;
                    case 'number_input':
                        handleNumberInputNext();
                        break;
                    case 'yes_no':
                        handleYesNoNext();
                        break;
                    case 'measurement_input':
                        // For measurement_input, use the standard handleComplete
                        handleComplete();
                        break;
                    default:
                        console.log(`Unhandled question type: ${displayQuestion.type}`);
                        handleComplete();
                        break;
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
        return <CubeLoader />
    }

    if (!displayQuestion) {
        return null;
    }

    const isLastQuestion = currentStage === totalStages && !hasFollowUpQuestion && isLatestQuestion;

    // Always show navigation buttons
    const shouldShowNavButtons = true;

    // Define a proper onNext handler that does absolutely nothing for measurement inputs
    const handleMeasurementInputNext = () => {
        // This is a no-op function that explicitly does nothing
        return;
    };

    return (
        <div className="space-y-6">
            <QuestionCard
                question={displayQuestion}
                selectedAnswers={currentSetAnswers[displayQuestion.id]?.answers || []}
                onSelect={(question, answers) => {
                    handleAnswer(question, answers);
                }}
                onNext={
                    // Use handleMeasurementInputNext for measurement_input and camera_measurement types
                    displayQuestion.type === 'measurement_input' || displayQuestion.type === 'camera_measurement'
                        ? handleMeasurementInputNext
                        : (isLatestQuestion ?
                            (displayQuestion.type === 'multiple_choice' ?
                                handleMultipleChoiceNext :
                                undefined) :
                            handleNext)
                }
                isLastQuestion={isLastQuestion}
                currentStage={currentStage}
                totalStages={totalStages}
                hasFollowUpQuestion={hasFollowUpQuestion}
                contractor={contractor}
                setShowNextButton={setNextButtonDisabled}
            />

            {shouldShowNavButtons && (
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
                        onClick={() => {
                            handleNext();
                        }}
                        disabled={nextButtonDisabled}
                        className={cn(
                            "flex items-center gap-2 px-6 py-5 text-base font-medium transition-all duration-200 w-40 bg-primary hover:bg-primary-700 text-primary-foreground"
                        )}
                    >
                        Continue
                        <ArrowRight size={20} />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default QuestionManager;