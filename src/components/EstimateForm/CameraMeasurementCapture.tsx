import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CameraMeasurementCaptureProps {
    onCapture: (measurement: string, description?: string) => void;
    onCancel: () => void;
    unit: string;
    instructions?: string;
}

export const CameraMeasurementCapture = ({
                                             onCapture,
                                             onCancel,
                                             unit,
                                             instructions = "Take a photo to automatically measure"
                                         }: CameraMeasurementCaptureProps) => {
    const [step, setStep] = useState<'camera' | 'description' | 'processing' | 'result'>('camera');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [measurement, setMeasurement] = useState<string | null>(null);
    const [description, setDescription] = useState<string>('');
    const [remainingChars, setRemainingChars] = useState(50);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle camera initialization
    useEffect(() => {
        if (step === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }

        return () => stopCamera();
    }, [step]);

    // Handle character count for description
    useEffect(() => {
        setRemainingChars(50 - description.length);
    }, [description]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            // Fallback to file selection if camera access fails
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                if (event.target?.result) {
                    setCapturedImage(event.target.result as string);
                    processCapturedImage();
                }
            };

            reader.readAsDataURL(file);
        }
    };

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);

        // Proceed to next step - description
        setStep('description');
    };

    const processCapturedImage = () => {
        setStep('processing');

        // Simulate AI processing with a timeout
        setTimeout(() => {
            // Generate realistic measurement based on unit
            let simulatedMeasurement;
            switch (unit) {
                case 'SF':
                    simulatedMeasurement = Math.floor(Math.random() * 400 + 100).toString();
                    break;
                case 'LF':
                    simulatedMeasurement = Math.floor(Math.random() * 40 + 10).toString();
                    break;
                case 'IN':
                    simulatedMeasurement = Math.floor(Math.random() * 48 + 24).toString();
                    break;
                default:
                    simulatedMeasurement = Math.floor(Math.random() * 50 + 5).toString();
            }

            setMeasurement(simulatedMeasurement);
            setStep('result');
        }, 2500); // Simulate 2.5 second processing time
    };

    const submitDescription = () => {
        processCapturedImage();
    };

    const handleBackButton = () => {
        if (step === 'description') {
            setStep('camera');
        } else if (step === 'result') {
            setStep('description');
            setMeasurement(null);
        }
    };

    const handleDone = () => {
        if (measurement) {
            onCapture(measurement, description);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
                {step !== 'camera' ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBackButton}
                        className="text-gray-700"
                    >
                        <ArrowLeft size={24} />
                    </Button>
                ) : (
                    <div className="w-10"></div>
                    )}

                <h3 className="text-lg font-medium text-center flex-1">
                    {step === 'camera' && 'Take a Photo'}
                    {step === 'description' && 'Describe What to Measure'}
                    {step === 'processing' && 'Processing Measurement'}
                    {step === 'result' && 'Measurement Result'}
                </h3>

                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-700"
                    onClick={onCancel}
                >
                    <X size={24} />
                </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {/* Camera View */}
                {step === 'camera' && (
                    <div className="relative h-full flex flex-col items-center">
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="max-w-full max-h-full object-contain"
                            />

                            {/* Guidelines overlay */}
                            <div className="absolute inset-0 pointer-events-none border-2 border-white border-opacity-50 m-8 rounded-md" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white">
                            {/* Camera controls */}
                            <div className="flex justify-center items-center mb-4">
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="rounded-full h-16 w-16 flex items-center justify-center"
                                    onClick={captureImage}
                                >
                                    <Camera size={28} />
                                </Button>
                            </div>

                            {/* Alternative upload option */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                                className="hidden"
                            />

                            <Button
                                variant="ghost"
                                className="w-full text-primary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Upload from gallery
                            </Button>
                        </div>
                    </div>
                )}

                {/* Description Entry */}
                {step === 'description' && capturedImage && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 flex-1">
                            <div className="mb-6">
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700">
                                    Describe what needs to be measured
                                </label>

                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what you're measuring (e.g., 'Kitchen floor area')"
                                    className="min-h-[100px] text-base"
                                    maxLength={50}
                                />

                                <div className="text-right text-sm text-gray-500">
                                    {remainingChars} characters remaining
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t">
                            <Button
                                className="w-full py-6"
                                onClick={submitDescription}
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {/* Processing State */}
                {step === 'processing' && (
                    <div className="flex flex-col items-center justify-center h-full p-6">
                        <div className="w-16 h-16 mb-6 border-4 border-t-primary border-primary-100 rounded-full animate-spin"></div>
                        <h3 className="text-xl font-medium mb-2">Processing Measurement</h3>
                        <p className="text-gray-500 text-center">
                            Our AI is analyzing your image to determine the {unit === 'SF' ? 'area' : 'length'}.
                            This may take a moment.
                        </p>
                    </div>
                )}

                {/* Result View */}
                {step === 'result' && measurement && capturedImage && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 flex-1">
                            <div className="mb-6">
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                            </div>

                            {description && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                                    <p className="text-gray-900">{description}</p>
                                </div>
                            )}

                            <div className="bg-gray-50 p-6 rounded-lg text-center">
                                <h3 className="text-lg font-medium text-gray-600 mb-2">
                                    Detected Measurement
                                </h3>
                                <div className="text-4xl font-bold text-primary">
                                    {measurement} <span className="text-2xl">{unit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t">
                            <Button
                                className="w-full py-6"
                                onClick={handleDone}
                            >
                                Use This Measurement
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};