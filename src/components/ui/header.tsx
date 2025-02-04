import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";

export function Header1() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <span className="font-semibold text-xl">Lovable</span>
        </a>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="default"
          size="lg"
          onClick={() => navigate('/estimate')}
        >
          Get started
        </Button>
      </div>
    </header>
  );
}