import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function Header1() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl font-bold text-primary">EstimateAI</h1>
          </motion.div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/signup")}
              variant="outline"
              className="text-gray-800 hover:text-gray-600"
            >
              Sign Up
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="text-gray-800 hover:text-gray-600"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}