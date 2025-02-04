import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function Footerdemo() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/newsletter-subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) throw new Error("Subscription failed");

      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-white border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-8">
              <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
              <ul role="list" className="mt-6 space-y-4">
                <li>
                  <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/industries" className="text-sm text-gray-600 hover:text-gray-900">
                    Industries
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-8">
              <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
              <ul role="list" className="mt-6 space-y-4">
                <li>
                  <button 
                    onClick={() => setShowPrivacy(true)} 
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowTerms(true)} 
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowCookies(true)} 
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cookie Settings
                  </button>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900">Stay connected</h3>
              <p className="mt-6 text-sm text-gray-600">
                Subscribe to our newsletter for updates and exclusive content.
              </p>
              <form onSubmit={handleSubscribe} className="mt-4 flex max-w-md">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="ml-4"
                >
                  {isLoading ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information.</p>
            {/* Add more privacy policy content here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>By using our service, you agree to these terms. Please read them carefully.</p>
            {/* Add more terms of service content here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cookie Settings Dialog */}
      <Dialog open={showCookies} onOpenChange={setShowCookies}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>We use cookies to enhance your browsing experience. Manage your cookie preferences here.</p>
            {/* Add cookie settings controls here */}
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}