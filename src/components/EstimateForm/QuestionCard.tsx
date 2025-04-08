import {useState, useEffect, useRef} from "react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {Question} from "@/types/estimate";
import {useIsMobile} from "@/hooks/use-mobile";
import {useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {Database} from "@/integrations/supabase/types";
import {VoiceInput} from "./VoiceInput";
import {QuestionOption} from "./QuestionOption";
import {Camera, Info} from "lucide-react";
import {useTranslation} from "react-i18next";
import {CameraMeasurementModal} from "./CameraMeasurementModal";

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
    contractor?: Contractor;
    setShowNextButton?: (show: boolean) => void;
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
                                 contractor,
                                 setShowNextButton
                             }: QuestionCardProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [measurementValue, setMeasurementValue] = useState("");
    const [error, setError] = useState("");
    const [isCameraMeasurementOpen, setIsCameraMeasurementOpen] = useState(false);
    const questionLoadTime = useRef<number>(0);
    const isMobile = useIsMobile();
    const {contractorId} = useParams();
    const toastRef = useRef<string | null>(null);
    const measurementInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    // Only fetch contractor data if not provided as prop
    const {data: fetchedContractor} = useQuery({
        queryKey: ["contractor", contractorId],
        queryFn: async () => {
            if (!contractorId) return null;
            const {data, error} = await supabase
                .from("contractors")
                .select("*")
                .eq("id", contractorId)
                .single();
            if (error) throw error;
            return data as Contractor;
        },
        enabled: !!contractorId && !contractor
    });

    // Use the contractor from props or from the query
    const activeContractor = contractor || fetchedContractor;

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

            // For radio buttons, just select the option without auto-advancing
            setTimeout(() => {
                setIsProcessing(false);
            }, 200);
        }
    };

    const handleMeasurementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMeasurementValue(value);

        if (value === "") {
            setError("");
            setShowNextButton(false);
            return;
        }

        // Validate the measurement based on the validation pattern if provided
        if (question.validation) {
            const regex = new RegExp(question.validation);
            if (value && !regex.test(value)) {
                setError(question.validation_message || "Please enter a valid measurement");
                // Do NOT set showNextButton to true
            } else {
                setError("");
                onSelect(question.id, [value]);
                setShowNextButton(true);
            }
        } else {
            // If no validation pattern, just update the selected answer
            onSelect(question.id, [value]);
            setShowNextButton(true);
        }
    };

    const handleContinueClick = () => {
        // Explicitly show next button and allow manual navigation
        setShowNextButton(true);
        if (onNext) {
            onNext();
        }
    };

    const handleCameraClick = () => {
        // Open the camera measurement modal
        setIsCameraMeasurementOpen(true);
    };

    const handleMeasurementComplete = (value: string) => {
        // Set the measurement value from the camera measurement
        setMeasurementValue(value);
        // Update the selected answer
        // onSelect(question.id, [value]);
        // Enable next button
        setShowNextButton(true);
    };

    const shouldShowImage = (option: any) => {
        if (!option.image_url) return false;
        if (option.image_url.includes('example')) return false;
        if (!isNaN(option.value)) return false;
        return true;
    };

    const options = Array.isArray(question?.options) ? question.options : [];

    return (
        <>
            <Card className={cn(
                "w-full max-w-6xl mx-auto relative bg-white shadow-md border-0",
                isMobile ? "px-0 py-6 rounded-none" : "p-8 rounded-xl"
            )}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className={cn(
                        "font-semibold text-gray-800",
                        isMobile ? "text-lg px-4" : "text-2xl"
                    )}>{question?.question}</h2>
                </div>

                {question.type === 'measurement_input' ? (
                    <div className="space-y-6 mb-12 px-4 md:px-0">
                        {/* Measurement Input UI */}
                        <div className="space-y-3">
                            {/* Helper text with hint */}
                            {question.helper_text && (
                                <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                                    <Info className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                                    <p>{question.helper_text}</p>
                                </div>
                            )}

                            {/* Manual input with unit display */}
                            <div className="space-y-2">
                                <label htmlFor="measurement-input" className="text-sm font-medium text-gray-700">
                                    Input total {question.unit ? `in ${question.unit}` : ''}
                                </label>
                                <div className="relative">
                                    <Input
                                        id="measurement-input"
                                        ref={measurementInputRef}
                                        type="text"
                                        placeholder={question.placeholder || `Enter measurement${question.unit ? ` (${question.unit})` : ''}`}
                                        value={measurementValue}
                                        label={t("Input total")}
                                        onChange={handleMeasurementChange}
                                        className={cn(
                                            "pr-12 py-6 text-lg h-16",
                                            error ? "border-red-500 focus:ring-red-500" : "focus:ring-primary"
                                        )}
                                    />
                                    {question.unit && (
                                        <div
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                            {question.unit}
                                        </div>
                                    )}
                                </div>
                                {error && (
                                    <p className="text-sm text-red-500 mt-1">{error}</p>
                                )}
                            </div>

                            {/* Divider with OR text */}
                            {question.camera_option && (
                                <div className="flex items-center my-6">
                                    <div className="flex-grow border-t border-gray-200"></div>
                                    <div className="px-4 text-gray-500 text-sm">or</div>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                </div>
                            )}

                            {/* Camera measurement option */}
                            {question.camera_option && (
                                <Button
                                    variant="outline"
                                    className="w-full py-6 flex items-center justify-center gap-2 border-dashed border-gray-300"
                                    onClick={handleCameraClick}
                                >
                                    <Camera className="h-5 w-5"/>
                                    <span>{question.camera_prompt || "Take photo to measure"}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-6 mb-12",
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
                )}
            </Card>

            {/* Camera Measurement Modal */}
            <CameraMeasurementModal
                isOpen={isCameraMeasurementOpen}
                onClose={() => setIsCameraMeasurementOpen(false)}
                onMeasurementComplete={handleMeasurementComplete}
                unit={question.unit}
            />
        </>
    );
};