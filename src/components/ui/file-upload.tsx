
import React from "react";
import { Input } from "./input";

interface FileUploadProps {
  accept?: string;
  onChange: (files: FileList | null) => void;
  maxSize?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ accept, onChange, maxSize }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      if (maxSize && files[0].size > maxSize) {
        alert(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        e.target.value = '';
        return;
      }
      onChange(files);
    } else {
      onChange(null);
    }
  };

  return (
    <Input
      type="file"
      accept={accept}
      onChange={handleFileChange}
      className="cursor-pointer"
    />
  );
};
