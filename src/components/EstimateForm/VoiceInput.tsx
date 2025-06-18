import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Question } from "@/types/estimate";

interface VoiceInputProps {
  question: Question;
  onSelect: (value: string) => void;
}

export const VoiceInput = ({ question, onSelect }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const startListening = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak now",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const matchingOption = question.options.find((option) =>
          option.label.toLowerCase().includes(transcript.toLowerCase()),
        );

        if (matchingOption) {
          onSelect(matchingOption.value);
          toast({
            title: "Voice recognized",
            description: `Selected: ${matchingOption.label}`,
          });
        } else {
          toast({
            title: "No match found",
            description: "Please try again or select manually",
            variant: "destructive",
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "Failed to recognize speech. Please try again.",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      size="icon"
      variant={isListening ? "destructive" : "outline"}
      className="rounded-full"
      onClick={() => (isListening ? setIsListening(false) : startListening())}
    >
      {isListening ? (
        <Square className="h-4 w-4" />
      ) : (
        <div className="relative">
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              isListening ? "animate-ping bg-red-400" : "",
            )}
          />
          <Mic className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
};
