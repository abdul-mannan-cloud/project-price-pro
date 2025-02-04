import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <main className="bg-background">
      <div className="w-full z-10 flex items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold">Welcome to the Estimator</h1>
      </div>
    </main>
  );
};

export default Index;