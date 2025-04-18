import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CameraOff, Loader2, Upload, X, Ruler, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface CameraMeasurementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMeasurementComplete: (measurement: string) => void;
    unit?: string;
}

export function CameraMeasurementModal({
                                           isOpen,
                                           onClose,
                                           onMeasurementComplete,
                                           unit = "",
                                       }: CameraMeasurementModalProps) {
    const [step, setStep] = useState<'upload' | 'describe' | 'measuring' | 'results'>('upload');
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [measurementResult, setMeasurementResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { t } = useTranslation();

    // For mobile camera capture
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setImages((prev) => [...prev, ...newFiles]);

            // Create preview URLs
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setImages((prev) => [...prev, ...newFiles]);

            // Create preview URLs
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        // Release the object URL to avoid memory leaks
        URL.revokeObjectURL(imagePreviews[index]);

        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Start new stream with current facing mode
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
            toast({
                title: "Camera Error",
                description: "Could not access your camera. Please check permissions.",
                variant: "destructive",
            });
            setIsCameraOpen(false);
        }
    };

    const switchCamera = async () => {
        // Toggle the camera facing mode
        setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');

        // Restart the camera with the new facing mode
        if (isCameraOpen) {
            await startCamera();
        }
    };

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setImages((prev) => [...prev, file]);

                        // Create preview URL
                        const preview = URL.createObjectURL(blob);
                        setImagePreviews((prev) => [...prev, preview]);

                        // Don't automatically stop camera to allow taking more pictures
                        // Just show a toast to indicate success
                        toast({
                            title: "Image Captured",
                            description: `${images.length + 1} image${images.length > 0 ? 's' : ''} added.`,
                            variant: "default",
                        });
                    }
                }, 'image/jpeg');
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const goToDescribeStep = () => {
        if (images.length === 0) {
            toast({
                title: "No Images",
                description: "Please add at least one image to continue.",
                variant: "destructive",
            });
            return;
        }
        setStep('describe');
    };

    const startMeasuring = async () => {
        if (description.trim() === "") {
            toast({
                title: "Description Required",
                description: "Please describe what you want to measure.",
                variant: "destructive",
            });
            return;
        }

        // Check minimum character length
        if (description.trim().length < 10) {
            toast({
                title: "Description Too Short",
                description: "Please provide a more detailed description (minimum 10 characters).",
                variant: "destructive",
            });
            return;
        }

        if (description.trim().length > 220) {
            toast({
                title: "Description Too Long",
                description: "Please provide a less detailed description (maximum 220 characters).",
                variant: "destructive",
            });
            return;
        }

        setStep('measuring');
        setIsProcessing(true);

        try {
            // Convert all images to base64
            const base64Images = await Promise.all(images.map(image => fileToBase64(image)));

            // Extract the base64 data (remove the data:image/jpeg;base64, prefix)
            const processedImages = base64Images.map(img => img.split(',')[1]);

            // Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('get-measurement', {
                body: {
                    image: processedImages[0], // Send first image for compatibility
                    images: processedImages, // Also send array of images
                    description: description + '\n The Unit for measurement is ' + unit
                }
            });

            if (error) {
                throw error;
            }

            setMeasurementResult(data);
            setStep('results');
        } catch (error) {
            console.error("Error processing measurement:", error);
            toast({
                title: "Measurement Error",
                description: "Could not process the measurement. Please try again.",
                variant: "destructive",
            });
            setStep('describe');
        } finally {
            setIsProcessing(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleUseMeasurement = () => {
        if (measurementResult?.measurements?.primary?.value) {
            // Format the measurement value based on the primary dimension
            const value = measurementResult.measurements.primary.value.toString();
            // Just update the measurement value but don't close the modal or proceed automatically
            onMeasurementComplete(value);
            onClose();

            // Clean up
            cleanUp();
        }
    };

    const cleanUp = () => {
        // Release all object URLs
        imagePreviews.forEach(url => URL.revokeObjectURL(url));

        // Stop any active camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Reset state
        setImages([]);
        setImagePreviews([]);
        setDescription("");
        setMeasurementResult(null);
        setStep('upload');
        setIsProcessing(false);
        setIsCameraOpen(false);
    };

    const handleCloseModal = () => {
        cleanUp();
        onClose();
    };

    // Handle adding more photos when in the describe step
    const handleAddMorePhotos = () => {
        setStep('upload');
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleCloseModal}>
            <DialogContent className="sm:max-w-lg">
                {/* Add a close button in the top-right corner */}
                <button 
                    onClick={handleCloseModal}
                    className="absolute right-4 top-4 rounded-sm opacity-70 disabled:pointer-events-none"
                    type="button"
                    aria-label="Close"
                >
                    <X className="h-4 w-4 hover:text-primary" />
                    <span className="sr-only">Close</span>
                </button>
                
                <DialogHeader>
                    <DialogTitle>
                        {step === 'upload' && "Add Photos for Measurement"}
                        {step === 'describe' && "Describe What to Measure"}
                        {step === 'measuring' && "AI Measuring..."}
                        {step === 'results' && "Measurement Results"}
                    </DialogTitle>
                </DialogHeader>

                {/* Step 1: Upload Photos */}
                {step === 'upload' && (
                    <div className="space-y-4">
                        {isCameraOpen ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-64 object-cover rounded-lg"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Camera controls */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {/* Switch camera button */}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 p-0"
                                            onClick={switchCamera}
                                        >
                                            <RefreshCw size={16} />
                                        </Button>
                                    </div>

                                    <div className="mt-4 flex justify-center gap-4">
                                        <Button onClick={takePicture} className="flex items-center gap-2">
                                            <Camera size={16} />
                                            Capture
                                        </Button>
                                        <Button variant="outline" onClick={stopCamera} className="flex items-center gap-2">
                                            <CameraOff size={16} />
                                            Done
                                        </Button>
                                    </div>
                                </div>

                                {/* Show captured images below camera */}
                                {imagePreviews.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Captured Images:</p>
                                        <div className="grid grid-cols-2 gap-2 pb-2">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative  flex-shrink-0">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index}`}
                                                        className="w-full h-full object-cover rounded-md"
                                                    />
                                                    <button
                                                        className="absolute right-0 top-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                                                        onClick={() => removeImage(index)}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Next button when in camera mode with images */}
                                {imagePreviews.length > 0 && (
                                    <div className="mt-2">
                                        <Button onClick={goToDescribeStep} className="w-full">
                                            Continue with {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                    />
                                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600">Drag & drop images or click to browse</p>
                                </div>

                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index}`}
                                                    className="w-full h-24 object-cover rounded-md"
                                                />
                                                <button
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button onClick={startCamera} variant="outline" className="flex-1">
                                        <Camera className="h-4 w-4 mr-2" />
                                        Take Photo
                                    </Button>
                                    <Button onClick={goToDescribeStep} className="flex-1" disabled={imagePreviews.length === 0}>
                                        Continue
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Rest of the code remains the same... */}
                {/* Step 2: Describe what to measure */}
                {step === 'describe' && (
                    <div className="space-y-4">
                        <div>
                            {/* Main image display */}
                            <div className="mb-4">
                                {imagePreviews.length > 0 && (
                                    <img
                                        src={imagePreviews[0]}
                                        alt="Main measurement image"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                )}
                            </div>

                            {/* Image thumbnails with add more button */}
                            <div className="mb-4">
                                <div className="flex overflow-x-auto gap-2 pb-2">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative min-w-16 w-16 h-16 flex-shrink-0">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index}`}
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                            <button
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                                                onClick={() => removeImage(index)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Add more photos button */}
                                    <div
                                        className="relative border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center min-w-16 w-16 h-16 flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={handleAddMorePhotos}
                                    >
                                        <Plus size={20} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Describe what is being measured
                                </label>
                                <Textarea
                                    id="description"
                                    placeholder="e.g., measure the flooring include all corners (minimum 30 characters)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="h-24"
                                />
                                {description.length > 0 && description.trim().length < 10 && (
                                    <p className="text-sm text-red-500 mt-1 text-right">
                                        [{10 - description.length} more characters]
                                    </p>
                                )}
                                {description.length > 9 && description.trim().length < 250 && (
                                    <p className={`text-sm mt-1 text-right ${description.length > 250 ? 'text-red-500' : 'text-grey-500'}`}>
                                        [{250 - description.length}/250 characters remaining]
                                    </p>
                                )}
                                {description.trim().length > 250 && (
                                    <p className={`text-sm mt-1 text-right ${description.length > 250 ? 'text-red-500' : 'text-grey-500'}`}>
                                        [{description.length}/250 characters]
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                                Back
                            </Button>
                            <Button disabled={description.trim().length < 10 || description.trim().length > 250} onClick={startMeasuring} className="flex-1 disabled:opacity-50">
                                Start Measuring
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Measuring Loader */}
                {step === 'measuring' && (
                    <div className="py-8 text-center">
                        <div className="animate-pulse flex flex-col items-center">
                            <Ruler className="h-16 w-16 text-primary mb-4" />
                            <p className="text-lg font-medium text-gray-700">Measuring...</p>
                            <p className="text-sm text-gray-500 mt-2">Our AI is calculating measurements from your images</p>
                        </div>
                    </div>
                )}

                {/* Step 4: Results */}
                {step === 'results' && measurementResult && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Primary Measurement</h3>
                                <div className="flex items-end">
                                    <span className="text-3xl font-bold">
                                        {measurementResult.measurements.primary.value}
                                    </span>
                                    <span className="text-xl ml-1 mb-0.5 text-gray-500">
                                        {measurementResult.measurements.primary.unit}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    {measurementResult.measurements.primary.dimension}
                                </p>
                            </div>

                            {measurementResult.measurements.additional &&
                                measurementResult.measurements.additional.length > 0 && (
                                    <div className="border-t border-gray-200 pt-3 mt-3">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Measurements</h3>
                                        {measurementResult.measurements.additional.map((item: any, index: number) => (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{item.dimension}</span>
                                                <span className="font-medium">
                                                    {item.value} {item.unit}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Confidence</h3>
                                <div className={cn(
                                    "text-sm px-2 py-1 rounded inline-block",
                                    measurementResult.confidence === "high" ? "bg-green-100 text-green-800" :
                                        measurementResult.confidence === "medium" ? "bg-yellow-100 text-yellow-800" :
                                            "bg-red-100 text-red-800"
                                )}>
                                    {measurementResult.confidence.charAt(0).toUpperCase() + measurementResult.confidence.slice(1)}
                                </div>
                            </div>
                        </div>

                        {measurementResult.reasoning && (
                            <div className="text-sm text-gray-600">
                                <h3 className="font-medium text-gray-700 mb-1">Reasoning</h3>
                                <p>{measurementResult.reasoning}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('describe')} className="flex-1">
                                Try Again
                            </Button>
                            <Button onClick={handleUseMeasurement} className="flex-1">
                                Use Measurement
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}