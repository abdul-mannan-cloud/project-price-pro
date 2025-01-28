import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-primary to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn">
              Smart Estimates for Home Improvement Projects
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 animate-fadeIn">
              Get instant, AI-powered cost estimates for your renovation projects
            </p>
            <Button
              onClick={() => navigate("/estimate")}
              size="lg"
              className="bg-white text-primary hover:bg-primary-100 animate-fadeIn"
            >
              Start Your Estimate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4 text-primary">⚡️</div>
            <h3 className="text-xl font-semibold mb-2">Instant Estimates</h3>
            <p className="text-gray-600">
              Get detailed cost breakdowns in minutes, not days
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4 text-primary">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-600">
              Advanced AI technology for accurate predictions
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4 text-primary">🏗️</div>
            <h3 className="text-xl font-semibold mb-2">Professional Grade</h3>
            <p className="text-gray-600">
              Trusted by contractors nationwide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;