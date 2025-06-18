import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/3d-button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Boxes } from "@/components/ui/background-boxes";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify token and get user
      const { data: resetData, error: resetError } = await supabase
        .from("password_resets")
        .select("user_id, used, expires_at")
        .eq("token", token)
        .single();

      if (resetError || !resetData) {
        throw new Error("Invalid or expired reset token");
      }

      if (resetData.used) {
        throw new Error("This reset token has already been used");
      }

      if (new Date(resetData.expires_at) < new Date()) {
        throw new Error("This reset token has expired");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Mark token as used
      await supabase
        .from("password_resets")
        .update({ used: true })
        .eq("token", token);

      toast({
        title: "Success",
        description: "Your password has been reset successfully",
      });

      navigate("/login");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while resetting your password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-black z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none opacity-90" />
      <Boxes className="!opacity-10 filter contrast-150 saturate-0" />

      <Card className="w-full max-w-md p-8 relative z-30 bg-white/10 backdrop-blur-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-gray-400">Enter your new password below</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
