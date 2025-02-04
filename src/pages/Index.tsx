import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's a default contractor ID and navigate to the estimate page
    const defaultContractorId = "098bcb69-99c6-445b-bf02-94dc7ef8c938";
    navigate(`/estimate/${defaultContractorId}`);
  }, [navigate]);

  return (
    <main className="bg-background">
      <div className="w-full z-10 flex items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold">Welcome to the Estimator</h1>
      </div>
    </main>
  );
};

export default Index;
