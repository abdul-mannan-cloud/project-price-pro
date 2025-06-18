import React, { useState, useRef } from "react";
import { Camera, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MeasurementInputProps {
  question: {
    id: string;
    question: string;
    unit: string;
    placeholder?: string;
    min?: number;
    max?: number;
    validation?: string;
    validation_message?: string;
    camera_option?: boolean;
    camera_prompt?: string;
    helpText?: string;
  };
  value: string;
  onChange: (value: string) => void;
  onNext?: () => void;
  onCaptureMeasurement: () => void;
}

export const MeasurementInput = ({
  question,
  value,
  onChange,
  onNext,
  onCaptureMeasurement,
}: MeasurementInputProps) => {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateInput = (inputValue: string) => {
    // Empty input is valid (for now) as we'll validate on submission
    if (!inputValue) {
      setError(null);
      return true;
    }

    // Check against regex pattern if provided
    if (question.validation) {
      const regex = new RegExp(question.validation);
      if (!regex.test(inputValue)) {
        setError(question.validation_message || "Please enter a valid number");
        return false;
      }
    }

    // Validate min/max if provided
    if (question.min !== undefined || question.max !== undefined) {
      const numValue = parseFloat(inputValue);

      if (question.min !== undefined && numValue < question.min) {
        setError(`Value must be at least ${question.min} ${question.unit}`);
        return false;
      }

      if (question.max !== undefined && numValue > question.max) {
        setError(`Value must be at most ${question.max} ${question.unit}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    validateInput(inputValue);
    onChange(inputValue);
  };

  const handleContinue = () => {
    if (validateInput(value) && onNext) {
      onNext();
    } else if (!value) {
      setError("Please enter a measurement or use camera");
      inputRef.current?.focus();
    }
  };

  // Based on your Figma design, create a layout with help text, input field, and camera option
  return (
    <div className="space-y-6">
      {/* Help text box */}
      {question.helpText && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-gray-700 text-sm">{question.helpText}</p>

          {/* Video Guide button */}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-sm bg-white"
          >
            Video Guide
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="space-y-2">
        <label className="text-gray-700 text-sm font-medium">
          Input total{" "}
          {question.unit === "SF"
            ? "flooring SF"
            : question.unit === "LF"
              ? "linear footage"
              : "measurement"}
        </label>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={`0 ${question.unit.toLowerCase()}`}
            className={cn(
              "w-full py-6 px-4 text-lg text-gray-900 placeholder-gray-400",
              error
                ? "border-red-500 focus-visible:ring-red-500"
                : "focus-visible:ring-primary",
            )}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      </div>

      {/* Divider with "or" */}
      {question.camera_option && (
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>
      )}

      {/* Camera button */}
      {question.camera_option && (
        <Button
          type="button"
          variant="outline"
          className="w-full py-6 flex items-center justify-center gap-3 text-primary border-primary hover:bg-primary-50 rounded-lg"
          onClick={onCaptureMeasurement}
        >
          <Camera size={20} />
          <span className="font-medium">Camera measurement</span>
        </Button>
      )}

      {/* Camera instructions */}
      {question.camera_option && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Capture project measurements with a single photo per area—make sure
          the entire space is visible in each shot.
          <br />
          <span className="text-primary">
            Avoid multiple photos of the same area.
          </span>
        </p>
      )}

      {/* Continue button */}
      {onNext && (
        <Button
          className="w-full py-6 mt-8 text-white font-medium"
          onClick={handleContinue}
        >
          Continue
        </Button>
      )}
    </div>
  );
};
