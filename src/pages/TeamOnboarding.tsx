
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

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!contractorId) {
        toast({
          title: "Invalid invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data: invitation, error } = await supabase
        .from("teammates")
        .select("*")
        .eq("contractor_id", contractorId)
        .eq("email", searchParams.get("email"))
        .eq("invitation_status", "pending")
        .single();

      if (error || !invitation) {
        toast({
          title: "Invalid invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setEmail(searchParams.get("email") || "");
      setIsVerifying(false);
    };

    verifyInvitation();
  }, [contractorId, navigate, searchParams, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_teammate: true,
            contractor_id: contractorId,
          },
        },
      });

      if (error) throw error;

      // Update teammate status
      const { error: updateError } = await supabase
        .from("teammates")
        .update({ invitation_status: "accepted" })
        .eq("contractor_id", contractorId)
        .eq("email", email);

      if (updateError) throw updateError;

      toast({
        title: "Account created",
        description: "Welcome to the team! You can now log in.",
      });

      navigate("/dashboard");
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
          <Input
            type="email"
            value={email}
            disabled
            label="Email"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            label="Password"
            required
          />
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
