
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PhotoUploadProps {
  onPhotosSelected: (urls: string[]) => void;
  onNext: () => void;
  uploadedPhotos: string[];
}

export const PhotoUpload = ({ onPhotosSelected, onNext, uploadedPhotos }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (files.length + uploadedPhotos.length > 12) {
      toast.error("Maximum 12 photos allowed");
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const compressedFile = await compressImage(file);
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project_images')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project_images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        onPhotosSelected([...uploadedPhotos, publicUrl]);
      }

      toast.success("Photos uploaded successfully");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload some photos");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...uploadedPhotos];
    newPhotos.splice(index, 1);
    onPhotosSelected(newPhotos);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          let width = img.width;
          let height = img.height;
          if (width > height && width > 1200) {
            height = (height * 1200) / width;
            width = 1200;
          } else if (height > 1200) {
            width = (width * 1200) / height;
            height = 1200;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => resolve(blob!),
            'image/jpeg',
            0.8
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6 w-full">
      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {uploadedPhotos.map((url, index) => (
            <div key={url} className="relative aspect-square">
              <img
                src={url}
                alt={`Uploaded photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {uploadedPhotos.length < 12 && (
            <label className={cn(
              "cursor-pointer aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors w-full",
              isUploading && "opacity-50 cursor-not-allowed"
            )}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                multiple
                className="hidden"
                capture="environment"
                disabled={isUploading}
              />
              <div className="text-center">
                {isUploading ? (
                  <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Plus className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm text-gray-500">
                      Add Photos
                    </span>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Uploading photos...</p>
            </div>
          </div>
        )}
      </div>

      {uploadedPhotos.length > 0 && (
        <div className="mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={onNext}
            disabled={isUploading}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
};
