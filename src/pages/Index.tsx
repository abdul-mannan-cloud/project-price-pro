import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="index-page min-h-screen bg-[#000000] text-white">
      <div className="bg-gradient-to-b from-[#222222] to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Smart Estimates for Home Improvement Projects
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-400 animate-fadeIn">
              Get instant, AI-powered cost estimates for your renovation projects
            </p>
            <Button
              onClick={() => navigate("/estimate")}
              size="lg"
              className="bg-[#007AFF] text-white hover:bg-[#0066CC] transition-all duration-300 animate-fadeIn transform hover:scale-105"
            >
              Start Your Estimate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 rounded-xl bg-[#111111] transition-all duration-300 hover:bg-[#222222] hover:transform hover:scale-105">
            <div className="text-4xl mb-4 text-[#007AFF]">⚡️</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Instant Estimates</h3>
            <p className="text-gray-400">
              Get detailed cost breakdowns in minutes, not days
            </p>
          </div>
          <div className="text-center p-8 rounded-xl bg-[#111111] transition-all duration-300 hover:bg-[#222222] hover:transform hover:scale-105">
            <div className="text-4xl mb-4 text-[#007AFF]">🤖</div>
            <h3 className="text-xl font-semibold mb-2 text-white">AI-Powered</h3>
            <p className="text-gray-400">
              Advanced AI technology for accurate predictions
            </p>
          </div>
          <div className="text-center p-8 rounded-xl bg-[#111111] transition-all duration-300 hover:bg-[#222222] hover:transform hover:scale-105">
            <div className="text-4xl mb-4 text-[#007AFF]">🏗️</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Professional Grade</h3>
            <p className="text-gray-400">
              Trusted by contractors nationwide
            </p>
          </div>
        </div>
      </div>

      <div className="fixed top-4 right-4">
        <Button
          onClick={() => navigate("/login")}
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#222222] transition-all duration-300"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
};

export default Index;