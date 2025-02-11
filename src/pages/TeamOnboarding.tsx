
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const TeamOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const contractorId = searchParams.get("contractor_id");
  const invitedEmail = searchParams.get("email");

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!contractorId || !invitedEmail) {
        console.error("Missing required params:", { contractorId, invitedEmail });
        toast({
          title: "Invalid invitation link",
          description: "The invitation link is missing required parameters.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        console.log("Verifying invitation for:", { contractorId, invitedEmail });
        
        // Query the teammates table to verify the invitation
        const { data: invitation, error } = await supabase
          .from("teammates")
          .select("*")
          .eq("contractor_id", contractorId)
          .eq("email", invitedEmail)
          .eq("invitation_status", "pending")
          .single();

        console.log("Invitation verification result:", { invitation, error });

        if (error || !invitation) {
          console.error("Invitation verification failed:", error || "No invitation found");
          toast({
            title: "Invalid invitation",
            description: "This invitation link is invalid or has expired. Please request a new invitation.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setEmail(invitedEmail);
        setIsVerifying(false);
      } catch (error: any) {
        console.error("Error during invitation verification:", error);
        toast({
          title: "Verification error",
          description: "An error occurred while verifying your invitation. Please try again.",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    verifyInvitation();
  }, [contractorId, navigate, invitedEmail, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !contractorId) return;

    setLoading(true);
    try {
      console.log("Creating account for teammate:", { email, contractorId });

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_teammate: true,
            contractor_id: contractorId,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Update teammate status to accepted
      const { error: updateError } = await supabase
        .from("teammates")
        .update({ invitation_status: "accepted" })
        .eq("contractor_id", contractorId)
        .eq("email", email);

      if (updateError) throw updateError;

      console.log("Account created successfully");
      
      toast({
        title: "Account created",
        description: "Welcome to the team! Please check your email to verify your account before logging in.",
      });

      // Redirect to login page instead of dashboard since they need to verify email first
      navigate("/login");
    } catch (error: any) {
      console.error("Error during signup:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Join Your Team</h1>
          <p className="text-sm text-muted-foreground">
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email
            </label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TeamOnboarding;
