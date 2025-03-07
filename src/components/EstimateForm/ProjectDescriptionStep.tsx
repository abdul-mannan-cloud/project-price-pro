
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectDescriptionStepProps {
  onSubmit: (description: string) => void;
  isSpeechSupported?: boolean;
}

export const ProjectDescriptionStep = ({ onSubmit, isSpeechSupported = false }: ProjectDescriptionStepProps) => {
  const [projectDescription, setProjectDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
    if (projectDescription.trim().length >= 30) {
      onSubmit(projectDescription);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setProjectDescription(transcript);
      };
      
      recognition.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  return (
    <div className="card p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Describe Your Project</h2>
        {/*{isSpeechSupported && (*/}
        {/*  <button*/}
        {/*    onClick={toggleRecording}*/}
        {/*    className={cn(*/}
        {/*      "p-2 rounded-full transition-all duration-200",*/}
        {/*      isRecording */}
        {/*        ? "bg-red-100 text-red-600 hover:bg-red-200" */}
        {/*        : "bg-gray-100 hover:bg-gray-200"*/}
        {/*    )}*/}
        {/*  >*/}
        {/*    {isRecording ? (*/}
        {/*      <MicOff className="h-5 w-5" />*/}
        {/*    ) : (*/}
        {/*      <Mic className="h-5 w-5" />*/}
        {/*    )}*/}
        {/*  </button>*/}
        {/*)}*/}
      </div>
      <div className="space-y-2 relative">
        <Textarea
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          placeholder="Describe what you need help with (e.g., paint my living room walls)..."
          className="min-h-[150px] pr-12"
        />
      </div>
      <Button 
        className="w-full mt-6"
        onClick={handleSubmit}
        disabled={projectDescription.trim().length < 30}
      >
        Continue
      </Button>
    </div>
  );
};
