import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }

    if (isSignUp && (!firstName || !lastName)) {
      toast({
        title: "Missing Fields",
        description: "Please provide both first and last name.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            setIsSignUp(false); // Switch to sign in mode
            toast({
              title: "Account Already Exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
            return;
          }
          throw signUpError;
        }

        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        navigate("/onboarding");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message === "Invalid login credentials") {
            throw new Error("Invalid email or password. Please try again.");
          }
          if (signInError.message.includes("Email not confirmed")) {
            throw new Error("Please verify your email before signing in.");
          }
          throw signInError;
        }

        // Check if user has completed onboarding
        const { data: contractor } = await supabase
          .from("contractors")
          .select("*")
          .single();

        if (!contractor) {
          navigate("/onboarding");
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          navigate("/");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] p-4">
      <Card className="w-full max-w-md p-8 bg-white border-[#d2d2d7] shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1d1d1f]">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-[#86868b] mt-2">
            {isSignUp
              ? "Sign up to start estimating projects"
              : "Sign in to your account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[#1d1d1f]">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-white border-[#d2d2d7] text-[#1d1d1f] focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[#1d1d1f]">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-white border-[#d2d2d7] text-[#1d1d1f] focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#1d1d1f]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white border-[#d2d2d7] text-[#1d1d1f] focus:border-[#007AFF] focus:ring-[#007AFF]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#1d1d1f]">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white border-[#d2d2d7] text-[#1d1d1f] focus:border-[#007AFF] focus:ring-[#007AFF]"
              minLength={6}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#007AFF] hover:bg-[#0066CC] text-white transition-all duration-300"
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmail("");
              setPassword("");
              setFirstName("");
              setLastName("");
            }}
            className="text-[#007AFF] hover:text-[#0066CC] transition-colors bg-transparent"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Login;