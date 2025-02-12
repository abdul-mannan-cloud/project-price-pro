
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "./PhotoUpload";
import { SkipForward } from "lucide-react";

interface PhotoUploadStepProps {
  onPhotoUploaded: (url: string) => void;
  onSkip: () => void;
  contractor?: {
    business_name?: string;
    business_logo_url?: string;
  };
}

export const PhotoUploadStep = ({ onPhotoUploaded, onSkip, contractor }: PhotoUploadStepProps) => {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  return (
    <div className="card p-8 animate-fadeIn">
      <div className="flex flex-col items-start gap-6">
        <div className="flex items-center gap-6 w-full">
          {contractor?.business_logo_url && (
            <img 
              src={contractor.business_logo_url} 
              alt={contractor.business_name}
              className="h-16 w-16 object-contain rounded-lg"
            />
          )}
          <h2 className="text-2xl font-semibold">
            {contractor?.business_name || "Project"} Estimator
          </h2>
        </div>
        <p className="text-muted-foreground font-semibold">
          Quickly estimate your project cost in minutes! Simply take or upload a photo of what you want to repair or modify (e.g., "paint this wall").
        </p>
      </div>
      <div className="mt-8">
        <PhotoUpload 
          onPhotosSelected={(urls) => {
            setUploadedImageUrl(urls[0]);
            onPhotoUploaded(urls[0]);
          }}
          onNext={() => uploadedImageUrl && onPhotoUploaded(uploadedImageUrl)}
          uploadedPhotos={uploadedImageUrl ? [uploadedImageUrl] : []}
        />
        <Button 
          variant="ghost" 
          className="w-full mt-4" 
          size="lg" 
          onClick={onSkip}
        >
          <SkipForward className="mr-2" />
          Skip Photo
        </Button>
      </div>
    </div>
  );
};
