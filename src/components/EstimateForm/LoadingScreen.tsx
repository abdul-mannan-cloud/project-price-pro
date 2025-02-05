import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EstimateAnimation } from "./EstimateAnimation";

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0">
      <div className="text-center space-y-4 p-6 rounded-lg bg-white shadow-lg">
        <div className="w-[200px] h-[200px] mx-auto mb-4">
          <EstimateAnimation />
        </div>
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        </div>
        <p className="text-lg font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
};