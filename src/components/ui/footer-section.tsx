// src/components/ui/footer-section.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

export function Footerdemo() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { toast } = useToast();

  const navigate = useNavigate();

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
    } catch {
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
    <footer className="bg-white border-t relative z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Quick Links */}
            <div className="space-y-8">
              <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
              <ul role="list" className="mt-6 space-y-4">
                <li>
                  <Link to="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/industry" className="text-sm text-gray-600 hover:text-gray-900">
                    Industries
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-8">
              <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
              <ul role="list" className="mt-6 space-y-4">
                <li>
                  <button
                    onClick={() => navigate('/privacy-policy')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/terms-of-service')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <Link to="/blog" className="text-sm text-gray-600 hover:text-gray-900">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
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
                <Button type="submit" disabled={isLoading} className="ml-4">
                  {isLoading ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Support Email */}
        <div className="flex justify-center mb-4">
          <a
            href="mailto:support@estimatix.io"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            support@estimatix.io
          </a>
        </div>

        <div className="flex justify-center pb-8">
          <p>© {new Date().getFullYear()} ESTIMATIRX LLC. All rights reserved.</p>
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
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
