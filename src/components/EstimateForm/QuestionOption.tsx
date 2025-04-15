import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Option } from "@/types/estimate";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/NumberInput";
import { NumberLabelInput } from "@/components/ui/NumberLabelInput";
import { Textarea } from "@/components/ui/textarea";

interface QuestionOptionProps {
    option: Option;
    isSelected: boolean;
    type: 'multiple_choice' | 'single_choice' | 'yes_no';
    onClick: () => void;
    showImage: boolean;
    onInputChange?: (value: string) => void;
    inputValue?: string;
}

export const QuestionOption = ({
                                   option,
                                   isSelected,
                                   type,
                                   onClick,
                                   showImage,
                                   onInputChange,
                                   inputValue = ""
                               }: QuestionOptionProps) => {
    // Determine if this option has a special input type (text_input or number_input)
    const hasSpecialInput = option.type === 'text_input' || option.type === 'number_input';
    const [localInputValue, setLocalInputValue] = useState(inputValue);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus input when option is selected
    useEffect(() => {
        if (isSelected && hasSpecialInput) {
            setTimeout(() => {
                if (option.type === 'text_input') {
                    if (option.character_limit && parseInt(option.character_limit) > 100) {
                        textareaRef.current?.focus();
                    } else {
                        inputRef.current?.focus();
                    }
                } else if (option.type === 'number_input') {
                    inputRef.current?.focus();
                }
            }, 100);
        }
    }, [isSelected, hasSpecialInput, option.type, option.character_limit]);

    // Update local input value when prop changes
    useEffect(() => {
        setLocalInputValue(inputValue);
    }, [inputValue]);

    // Handle input value changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setLocalInputValue(value);

        // Validation
        let hasError = false;

        // Character limit validation for text input
        if (option.type === 'text_input' && option.character_limit) {
            const charLimit = parseInt(option.character_limit);
            if (value.length > charLimit) {
                setError(`Input is too long. Maximum ${charLimit} characters allowed.`);
                hasError = true;
            }
        }

        // Number validation
        if (option.type === 'number_input') {
            if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
                setError("Only numbers and decimals are allowed.");
                hasError = true;
            } else {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    if (option.min !== undefined && numValue < option.min) {
                        setError(`Value must be at least ${option.min}`);
                        hasError = true;
                    } else if (option.max !== undefined && numValue > option.max) {
                        setError(`Value must be at most ${option.max}`);
                        hasError = true;
                    }
                }
            }
        }

        // Regex validation if provided
        if (option.validation && value) {
            try {
                const regex = new RegExp(option.validation);
                if (!regex.test(value)) {
                    setError(option.validation_message || "Please enter valid input");
                    hasError = true;
                }
            } catch (e) {
                console.error("Invalid regex pattern:", option.validation);
            }
        }

        if (!hasError) {
            setError("");
            onInputChange?.(value);
        }
    };

    const renderInputField = () => {
        if (!hasSpecialInput || !isSelected) return null;

        if (option.type === 'text_input') {
            const characterLimit = option.character_limit ? parseInt(option.character_limit) : undefined;

            if (characterLimit && characterLimit > 100) {
                // Render textarea for longer inputs
                return (
                    <div className="mt-3 px-4 pb-4">
                        <Textarea
                            ref={textareaRef}
                            value={localInputValue}
                            onChange={handleInputChange}
                            placeholder={option.placeholder || "Enter text..."}
                            maxLength={characterLimit}
                            rows={3}
                            className={cn(
                                "w-full rounded-md border focus:ring-2 focus:border-primary focus:ring-primary-100",
                                error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                            )}
                        />
                        {characterLimit && (
                            <div className="text-xs text-gray-500 text-right mt-1">
                                {localInputValue.length}/{characterLimit}
                            </div>
                        )}
                        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                    </div>
                );
            } else {
                // Render standard input for shorter text
                return (
                    <div className="mt-3 px-4 pb-4">
                        <Input
                            ref={inputRef}
                            type="text"
                            value={localInputValue}
                            onChange={handleInputChange}
                            placeholder={option.placeholder || "Enter text..."}
                            maxLength={characterLimit}
                            className={cn(
                                "w-full rounded-md border focus:ring-2 focus:border-primary focus:ring-primary-100",
                                error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
                            )}
                        />
                        {characterLimit && (
                            <div className="text-xs text-gray-500 text-right mt-1">
                                {localInputValue.length}/{characterLimit}
                            </div>
                        )}
                        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                    </div>
                );
            }
        } else if (option.type === 'number_input') {
            return (
                <div className="mt-3 px-4 pb-4">
                    <div className="relative">
                        <NumberLabelInput
                            label={option.placeholder || "Enter number"}
                            NumberInputProp={
                                <NumberInput
                                    id={`number-input-${option.value}`}
                                    ref={inputRef}
                                    type="text"
                                    pattern="[0-9]*(.[0-9]+)?"
                                    inputMode="decimal"
                                    placeholder=" "
                                    value={localInputValue}
                                    min={option.min}
                                    max={option.max}
                                    onChange={handleInputChange}
                                    className={cn(
                                        "peer pr-12 pt-4 pb-2 text-lg h-12 border rounded-md focus:ring-2 focus:border-primary focus:ring-primary-100",
                                        error ? "border-red-500 focus:ring-red-500" : ""
                                    )}
                                />
                            }
                        />
                        {option.unit && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                {option.unit}
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                </div>
            );
        }

        return null;
    };


    // This setup allows the option to be clicked normally, but also display an
    // input field directly below it when selected
    return (
        <div className={cn(
            "rounded-xl overflow-hidden transition-all duration-200",
            hasSpecialInput && isSelected ? "shadow-sm" : ""
        )}>
            <div
                onClick={onClick}
                className={cn(
                    "group relative rounded-xl transition-all duration-200 cursor-pointer overflow-hidden",
                    isSelected
                        ? "bg-primary-100 ring-2 ring-primary ring-offset-1"
                        : "hover:bg-primary-50 border border-gray-200 hover:border-primary-300",
                    showImage ? "pb-4" : "p-4",
                    hasSpecialInput && isSelected ? "rounded-b-none" : ""
                )}
            >
                {showImage && option.image_url && (
                    <div className="w-full aspect-video overflow-hidden">
                        <img
                            src={option.image_url}
                            alt={option.label}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                )}

                <div className={cn(
                    "flex items-center gap-3 w-full",
                    showImage ? "px-4 pt-4" : ""
                )}>
                    {type === 'multiple_choice' ? (
                        <div className={cn(
                            "flex-shrink-0 h-6 w-6 rounded-md border transition-all duration-200",
                            isSelected
                                ? "bg-primary border-primary"
                                : "border-gray-300 group-hover:border-primary-400",
                            "flex items-center justify-center"
                        )}>
                            <Check className={cn(
                                "w-4 h-4 text-white transition-all duration-200",
                                isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
                            )}/>
                        </div>
                    ) : (
                        <div className={cn(
                            "flex-shrink-0 h-6 w-6 rounded-full border transition-all duration-200",
                            isSelected
                                ? "border-2 border-primary"
                                : "border-gray-300 group-hover:border-primary-400"
                        )}>
                            <div className={cn(
                                "w-3 h-3 rounded-full bg-primary m-[3px] transition-all duration-200",
                                isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
                            )}/>
                        </div>
                    )}

                    <div className="flex flex-col w-full">
            <span className={cn(
                "text-base sm:text-lg transition-all duration-200",
                isSelected
                    ? "font-medium text-primary-700"
                    : "text-gray-800 group-hover:text-primary-600"
            )}>
              {option.label}
            </span>

                        {option.description && (
                            <span className="text-sm text-gray-500 mt-1">
                {option.description}
              </span>
                        )}

                        {/* Small indicator that this option has input capability */}
                        {hasSpecialInput && !isSelected && (
                            <span className="text-xs text-primary-600 mt-1">
                {option.type === 'text_input' ? 'Enter text...' : 'Enter number...'}
              </span>
                        )}
                    </div>
                </div>

                {/* Subtle hover effect overlay */}
                <div className={cn(
                    "absolute inset-0 bg-primary-100 opacity-0 pointer-events-none transition-opacity duration-300",
                    isSelected ? "opacity-0" : "group-hover:opacity-5"
                )}/>
            </div>

            {/* Render input field below the option when selected */}
            {renderInputField()}
        </div>
    );

    // Render the appropriate input field based on type

}
