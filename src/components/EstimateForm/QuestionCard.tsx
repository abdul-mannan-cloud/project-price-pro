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
import {Camera, Info, HelpCircle, Video} from "lucide-react";
import {useTranslation} from "react-i18next";
import {CameraMeasurementModal} from "./CameraMeasurementModal";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {NumberInput} from "@/components/ui/NumberInput.tsx";
import {NumberLabelInput} from "@/components/ui/NumberLabelInput.tsx";
import { Textarea } from "@/components/ui/textarea";

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
    setNextButtonDisable?: (show: boolean) => void;
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
                                 setNextButtonDisable
                             }: QuestionCardProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [measurementValue, setMeasurementValue] = useState("");
    const [textInputValue, setTextInputValue] = useState("");
    const [numberInputValue, setNumberInputValue] = useState("");
    const [activeInputOption, setActiveInputOption] = useState<any>(null);
    const [error, setError] = useState("");
    const [isCameraMeasurementOpen, setIsCameraMeasurementOpen] = useState(false);
    const [selectedInputMethod, setSelectedInputMethod] = useState<string | null>(null);
    const [optionInputValues, setOptionInputValues] = useState<Record<string, string>>({});
    const questionLoadTime = useRef<number>(0);
    const isMobile = useIsMobile();
    const {contractorId} = useParams();
    const toastRef = useRef<string | null>(null);
    const measurementInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const numberInputRef = useRef<HTMLInputElement>(null);
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

    // Set initial values from selectedAnswers
    useEffect(() => {

        if (selectedAnswers.length > 0) {
            setNextButtonDisable(false);
            if (question.type === 'text_input') {
                setTextInputValue(selectedAnswers[0] || "");
            } else if (question.type === 'number_input') {
                setNumberInputValue(selectedAnswers[0] || "");
            } else if (question.type === 'measurement_input' || question.type === 'camera_measurement') {
                setMeasurementValue(selectedAnswers[0] || "");
            } else if (question.type === 'single_choice') {
                // if(selectedAnswers[0] === 'custom_size' && )
                // For single choice, we need to check if the selected answer is an option with special input
                const selectedOption = question.options.find(opt => opt.value === selectedAnswers[0]);
                if (selectedOption && (selectedOption.type === 'text_input' || selectedOption.type === 'number_input')) {
                    // If this option has additional input, we need to set its value if available
                    if (selectedAnswers.length > 1) {
                        setOptionInputValues({
                            ...optionInputValues,
                            [selectedAnswers[0]]: selectedAnswers[1]
                        });
                    }
                }
            }
        } else {
            // Reset values when question changes
            setNextButtonDisable(true);

            setTextInputValue("");
            setNumberInputValue("");
            setOptionInputValues({});
        }
    }, [question.id, selectedAnswers]);


    useEffect(() => {
        questionLoadTime.current = Date.now();

        // Reset selected input method when question changes
        setSelectedInputMethod(null);
        setActiveInputOption(null);

        //setNextButtonDisable?.(question.type === 'multiple_choice' ? selectedAnswers.length > 0 : selectedAnswers.length >= 1);

        setIsProcessing(false);
    }, [question.id, selectedAnswers]);

    const handleOptionClick = async (value: string, option?: any) => {
        if (question.type === 'multiple_choice') {
            const newSelection = selectedAnswers.includes(value)
                ? selectedAnswers.filter(v => v !== value)
                : [...selectedAnswers, value];
            onSelect(question.id, newSelection);
            setNextButtonDisable(false);
        } else {
            if (isProcessing) return;
            setIsProcessing(true);

            // For single_choice with special input types
            if (option && (option.type === 'text_input' || option.type === 'number_input')) {
                const optionValue = optionInputValues[value] || "";
                onSelect(question.id, [value, optionValue]);

                setNextButtonDisable(true);
                // Just select the option, don't auto-advance
                // If we already have an input value for this option, include it
            } else {
                // Regular option selection
                onSelect(question.id, [value]);
                setNextButtonDisable(false);
            }

            setTimeout(() => {
                setIsProcessing(false);
            }, 200);
        }
    };

    const handleOptionInputChange = (optionValue: string, inputValue: string) => {
        //setNextButtonDisable(true)
        setOptionInputValues({
            ...optionInputValues,
            [optionValue]: inputValue
        });
        onSelect(question.id, [optionValue, inputValue]);
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setTextInputValue(value);

        // Validation
        let hasError = false;

        // Character limit validation
        const charLimit = activeInputOption?.character_limit || question.character_limit;
        if (charLimit && value.length > parseInt(charLimit)) {
            setError(`Input is too long. Maximum ${charLimit} characters allowed.`);
            //setNextButtonDisable?.(false);
            hasError = true;
        }

        // Regex validation
        const validationRegex = activeInputOption?.validation || question.validation;
        if (validationRegex && value) {
            try {
                const regex = new RegExp(validationRegex);
                if (!regex.test(value)) {
                    setError(activeInputOption?.validation_message || question.validation_message || "Please enter valid input");
                    //setNextButtonDisable?.(false);
                    hasError = true;
                }
            } catch (e) {
                console.error("Invalid regex pattern:", validationRegex);
            }
        }

        if (!hasError) {
            setError("");
            onSelect(question.id, [value]);
            //setNextButtonDisable?.(value.trim().length > 0);
        }
    };

    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Validate that input is a valid number
        if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
            setError("Only numbers and decimals are allowed.");
            setNextButtonDisable(true);
            return;
        }

        setNumberInputValue(value);

        if (value === "") {
            setError("");
            setNextButtonDisable(true);
            return;
        }

        // Additional validations for min/max
        const numValue = parseFloat(value);
        let hasError = false;

        const minValue = activeInputOption?.min || question.min;
        const maxValue = activeInputOption?.max || question.max;

        if (!isNaN(numValue)) {
            if (minValue !== undefined && numValue < parseFloat(minValue)) {
                setError(`Value must be at least ${minValue}`);
                setNextButtonDisable(true);
                hasError = true;
            } else if (maxValue !== undefined && numValue > parseFloat(maxValue)) {
                setError(`Value must be at most ${maxValue}`);
                setNextButtonDisable(true);
                hasError = true;
            }
        }

        // Regex validation
        const validationRegex = activeInputOption?.validation || question.validation;
        if (validationRegex && value) {
            try {
                const regex = new RegExp(validationRegex);
                if (!regex.test(value)) {
                    setError(activeInputOption?.validation_message || question.validation_message || "Please enter a valid number");
                    setNextButtonDisable(true);
                    hasError = true;
                }
            } catch (e) {
                console.error("Invalid regex pattern:", validationRegex);
            }
        }

        if (!hasError) {
            setError("");
            onSelect(question.id, [value]);
            setNextButtonDisable(false);
            console.log("Enabling the next button");
            
        }
    };

    const handleMeasurementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Allow only numbers and one optional dot
        if (!/^\d*\.?\d*$/.test(value)) {
            setError("Only numbers and decimals are allowed.");
            setNextButtonDisable(true);
            return;
        }

        if (value === "") {
            setError("");
            setNextButtonDisable(true);
            setMeasurementValue(value);
            return;
        }

        const numValue = parseFloat(value);

        if (!isNaN(numValue)) {
            if (question?.options?.[0]?.min !== undefined && numValue < question?.options[0]?.min) {
                setError(`Value must be at least ${question.options[0].min} ${question.unit || ''}`);
                setNextButtonDisable(true);
                return;
            }
            if (question.options?.[0]?.max !== undefined && numValue > question.options[0].max) {
                setError(`Value must be at most ${question.options[0].max} ${question.unit || ''}`);
                setNextButtonDisable(true);
                return;
            }
        }

        // Regex validation (if exists)
        if (question.validation) {
            const regex = new RegExp(question.validation);
            if (!regex.test(value)) {
                setError(question.validation_message || "Please enter a valid measurement");
                setNextButtonDisable(true);
                return;
            }
        }

        // All good
        onSelect(question.id, [value]);
        setError("");
        setNextButtonDisable(false);
        console.log("Enabling the next button");
    };

    const handleCameraClick = (option?: any) => {
        // Set the selected input method if option is provided
        if (option) {
            setSelectedInputMethod(option.type || 'camera_measurement');
        }

        // Open the camera measurement modal
        setIsCameraMeasurementOpen(true);
    };

    const handleMeasurementComplete = (value: string) => {
        // Set the measurement value from the camera measurement
        setMeasurementValue(value);
        // Update the selected answer but don't call onSelect which would advance to next question
        onSelect(question.id, [value]);
        // Enable next button - user will need to click Continue manually
        //setNextButtonDisable?.(false);
    };


    const shouldShowImage = (option: any) => {
        if (!option.image_url) return false;
        if (option.image_url.includes('example')) return false;
        if (!isNaN(option.value)) return false;
        return true;
    };

    const renderVideoGuideButton = (videoUrl: string) => {
        return (
            <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline ml-2"
            >
                <Video className="h-4 w-4" />
                <span>Watch guide</span>
            </a>
        );
    };

    // Handle the options array for camera_measurement type questions
    const options = question.type === 'camera_measurement'
        ? (Array.isArray(question.options) ? question.options : [])
        : (Array.isArray(question.options) ? question.options : []);

    // Render text input
    const renderTextInput = (inputOption = null) => {
        const opt = inputOption || question;
        const characterLimit = opt.character_limit ? parseInt(opt.character_limit) : undefined;
        const placeholder = opt.placeholder || "Enter text...";
        const label = opt.label || "Your answer";

        return (
            <div className="space-y-3">
                <div className="font-medium text-gray-700 mb-2">{label}</div>
                {characterLimit && characterLimit > 100 ? (
                    // Use TextArea for longer text inputs
                    <div className="relative">
                        <Textarea
                            ref={textInputRef as any}
                            value={textInputValue}
                            onChange={handleTextInputChange}
                            placeholder={placeholder}
                            maxLength={characterLimit}
                            rows={4}
                            className={cn(
                                "w-full rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                error ? "border-red-500 focus:ring-red-500" : ""
                            )}
                        />
                        {characterLimit && (
                            <div className="text-xs text-gray-500 text-right mt-1">
                                {textInputValue.length}/{characterLimit}
                            </div>
                        )}
                    </div>
                ) : (
                    // Use regular Input for shorter text inputs
                    <div className="relative">
                        <Input
                            ref={textInputRef}
                            type="text"
                            value={textInputValue}
                            onChange={handleTextInputChange}
                            placeholder={placeholder}
                            maxLength={characterLimit}
                            className={cn(
                                "w-full h-12 rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                error ? "border-red-500 focus:ring-red-500" : ""
                            )}
                        />
                        {characterLimit && (
                            <div className="text-xs text-gray-500 text-right mt-1">
                                {textInputValue.length}/{characterLimit}
                            </div>
                        )}
                    </div>
                )}
                {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
            </div>
        );
    };


    // Render number input
    const renderNumberInput = (inputOption = null) => {
        const opt = inputOption || question;
        const placeholder = opt.placeholder || `Enter number`;
        const label = opt.label || "Your answer";
        const unit = opt.unit || question.unit || "";

        return (
            <div className="space-y-3">
                <div className="font-medium text-gray-700 mb-2">{label}</div>
                <div className="relative group">
                    <NumberLabelInput
                        label={placeholder}
                        NumberInputProp={<NumberInput
                            id={`number-input-${opt.type || 'question'}`}
                            ref={numberInputRef}
                            type="text"
                            pattern="[0-9]*(.[0-9]+)?"
                            inputMode="decimal"
                            placeholder=" "
                            value={numberInputValue}
                            min={opt.min}
                            max={opt.max}
                            onChange={handleNumberInputChange}
                            className={cn(
                                "peer pr-12 pt-4 pb-2 text-lg h-12 border rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                error ? "border-red-500 focus:ring-red-500" : ""
                            )}
                        />}
                    />
                    {unit && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            {unit}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
            </div>
        );
    };

    return (
        <>
            <Card className={cn(
                "w-full max-w-6xl mx-auto relative bg-white shadow-md border-0",
                isMobile ? "px-0 py-6 rounded-none" : "p-8 rounded-xl"
            )}>
                <div className="flex flex-col mb-8">
                    <div className="flex items-start justify-between">
                        <h2 className={cn(
                            "font-semibold text-gray-800",
                            isMobile ? "text-lg px-4" : "text-2xl"
                        )}>
                            {question?.question}
                        </h2>

                        {/* Video guide link */}
                        {question.video_guide && renderVideoGuideButton(question.video_guide)}
                    </div>

                    {/* Tooltip content as info box instead of hover */}
                    {question.tooltip && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg mt-4">
                            <Info className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                            <p>{question.tooltip}</p>
                        </div>
                    )}
                </div>

                {question.type === 'camera_measurement' ? (
                    <div className="space-y-6 mb-12 px-4 md:px-0">
                        {/* Camera Measurement UI - New Design with "or" separator */}
                        <div className="space-y-6">
                            {/* First check if we have an input option */}
                            {options.find(opt => opt.type === 'number_input' || opt.type === 'text_input') && (
                                <div className="space-y-3">
                                    {/* Find the first input option */}
                                    {(() => {
                                        const inputOption = options.find(opt => opt.type === 'number_input' || opt.type === 'text_input');
                                        return inputOption ? (
                                            <div>
                                                {/* <div className="font-medium text-gray-700 mb-2">{inputOption.label}</div> */}
                                                <div className="relative group">
                                                    <NumberLabelInput
                                                        label={inputOption.placeholder || `Enter ${question.unit ? `in ${question.unit}` : ''}`}
                                                        NumberInputProp={<NumberInput
                                                            id={`measurement-input-${inputOption.type}`}
                                                            ref={measurementInputRef}
                                                            type="text"
                                                            pattern={inputOption.type === 'number_input' ? "[0-9]*(.[0-9]+)?" : undefined}
                                                            inputMode={inputOption.type === 'number_input' ? "decimal" : "text"}
                                                            placeholder=" "
                                                            value={measurementValue}
                                                            min={inputOption.min}
                                                            max={inputOption.max}
                                                            onChange={handleMeasurementChange}
                                                            className={cn(
                                                                "peer pr-12 pt-4 pb-2 text-lg h-12 border rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                                                error ? "border-red-500 focus:ring-red-500" : ""
                                                            )}
                                                        />}
                                                    />

                                                    {question.unit && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                                            {question.unit}
                                                        </div>
                                                    )}
                                                </div>
                                                {error && (
                                                    <p className="text-sm text-red-500 mt-1">{error}</p>
                                                )}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}

                            {options.some(opt => opt.type === 'number_input' || opt.type === 'text_input') &&
                                options.some(opt => opt.type === 'camera_measurement') && (
                                    <div className="flex items-center my-6">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <div className="px-4 text-gray-500 text-sm">or</div>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                    </div>
                                )}

                            {/* Camera measurement option */}
                            {options.find(opt => opt.type === 'camera_measurement') && (
                                <div>
                                    {(() => {
                                        const cameraOption = options.find(opt => opt.type === 'camera_measurement');
                                        return cameraOption ? (
                                            <div className="space-y-3">
                                                <Button
                                                    variant="outline"
                                                    className="w-full py-6 flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
                                                    onClick={() => handleCameraClick(cameraOption)}
                                                >
                                                    <Camera className="h-5 w-5 text-primary"/>
                                                    <span className="font-medium">{cameraOption.label || "Camera measurement"}</span>
                                                </Button>

                                                {cameraOption.tooltip && (
                                                    <div className="text-sm text-gray-600 text-center">
                                                        {cameraOption.tooltip}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                ) : question.type === 'measurement_input' ? (
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

                            {/* Manual input with unit display and animated label */}
                            <div className="space-y-2">
                                <div className="relative group">
                                    <NumberLabelInput
                                        label={question.placeholder || `Enter measurement${question.unit ? ` (${question.unit})` : ''}`}
                                        NumberInputProp={<NumberInput
                                            id={`measurement-input`}
                                            ref={measurementInputRef}
                                            type="text"
                                            pattern="[0-9]*(.[0-9]+)?"
                                            inputMode="decimal"
                                            placeholder=" "
                                            value={measurementValue}
                                            min={question.min}
                                            max={question.max}
                                            onChange={handleMeasurementChange}
                                            className={cn(
                                                "peer pr-12 pt-4 pb-2 text-lg h-12 border rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                                error ? "border-red-500 focus:ring-red-500" : ""
                                            )}
                                        />}
                                    />
                                    {question.unit && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
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
                                    onClick={() => handleCameraClick()}
                                >
                                    <Camera className="h-5 w-5"/>
                                    <span>{question.camera_prompt || "Take photo to measure"}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                ) : question.type === 'text_input' ? (
                    <div className="space-y-6 mb-12 px-4 md:px-0">
                        {/* Text Input UI */}
                        {renderTextInput()}
                    </div>
                ) : question.type === 'number_input' ? (
                    <div className="space-y-6 mb-12 px-4 md:px-0">
                        {/* Number Input UI */}
                        {renderNumberInput()}
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-6 mb-12",
                        isMobile ? "grid-cols-1 px-4" : question.type === 'multiple_choice' ? "grid-cols-2" : "grid-cols-1"
                    )}>
                        {options.map((option) => (
                            <QuestionOption
                                key={option.value || option.label}
                                setNextButtonDisable={setNextButtonDisable}
                                option={option}
                                isSelected={selectedAnswers.includes(option.value)}
                                type={question.type}
                                onClick={() => handleOptionClick(option.value, option)}
                                showImage={shouldShowImage(option)}
                                onInputChange={(value) => handleOptionInputChange(option.value, value)}
                                inputValue={optionInputValues[option.value] || ""}
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