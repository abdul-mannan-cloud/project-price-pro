import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OtpInput from "@/components/OtpInput";

const Login = () => {
  const [activeTab, setActiveTab] = useState("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Set initial state based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/signup")) {
      setIsSignUp(true);
    } else if (path.includes("/login")) {
      setIsSignUp(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get contractor data to check verification status and tier
        const { data: contractor } = await supabase
          .from("contractors")
          .select("verified, tier")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // Route based on verification status and tier
        if (contractor) {
          if (contractor.verified) {
            navigate("/dashboard");
          } else if (contractor.tier === "enterprise") {
            navigate("/verification");
          } else {
            navigate("/onboarding");
          }
        } else {
          navigate("/onboarding");
        }
      }
    };
    checkUser();
  }, [navigate]);

  // Timer for resend OTP button
  useEffect(() => {
    let interval;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  const startResendTimer = () => {
    setResendTimer(60); // 60 seconds timer
  };

  const validateEmail = () => {
    if (!email) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateSignUpForm = () => {
    if (!email || !password || !firstName || !lastName) {
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

    return true;
  };

  const validatePasswordLogin = () => {
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const sendMagicLink = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;

      setOtpSent(true);
      startResendTimer();
      toast({
        title: "Magic Link Sent",
        description: "Check your email for a magic link to sign in. You can also enter the OTP code below.",
      });
    } catch (error) {
      console.error("Magic link error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP sent to your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'magiclink',
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "You have successfully signed in.",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Failed to get session after login");
      }

      // Get contractor data to check verification status and tier
      const { data: contractor, error: contractorError } = await supabase
        .from("contractors")
        .select("verified, tier")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (contractorError) throw contractorError;

      // Route based on verification status and tier
      if (contractor) {
        if (contractor.verified) {
          navigate("/dashboard");
        } else if (contractor.tier === "enterprise") {
          navigate("/verification");
        } else {
          navigate("/onboarding");
        }
      } else {
        navigate("/onboarding");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify OTP. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!validatePasswordLogin()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Failed to get session after login");
      }

      // Get contractor data to check verification status and tier
      const { data: contractor, error: contractorError } = await supabase
        .from("contractors")
        .select("verified, tier")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (contractorError) throw contractorError;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Route based on verification status and tier
      if (contractor) {
        if (contractor.verified) {
          navigate("/dashboard");
        } else if (contractor.tier === "enterprise") {
          navigate("/verification");
        } else {
          navigate("/onboarding");
        }
      } else {
        navigate("/onboarding");
      }
    } catch (error) {
      console.error("Password login error:", error);
      toast({
        title: "Authentication Error",
        description: error.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateSignUpForm()) return;

    if (!acceptTerms) {
      toast({
        title: "Accept Terms",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });
      navigate("/onboarding");
    } catch (error) {
      console.error("Sign up error:", error);
      toast({
        title: "Sign Up Error",
        description: error.message || "An error occurred during sign up.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!validateEmail() || resendTimer > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;

      startResendTimer();
      toast({
        title: "OTP Resent",
        description: "A new OTP has been sent to your email.",
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setOtpSent(true);
      startResendTimer();
      toast({
        title: "Reset Email Sent",
        description: "We've sent a password reset OTP to your email. Please check your inbox.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP sent to your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (error) throw error;

      setOtpVerified(true);
      toast({
        title: "OTP Verified",
        description: "Please enter your new password.",
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify OTP. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please enter and confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully. You can now sign in with your new password.",
      });

      setIsResetPassword(false);
      setOtpVerified(false);
      setOtpSent(false);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveTab("password");
    } catch (error) {
      console.error("Password update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to switch to signup and update URL
  const switchToSignUp = () => {
    setIsSignUp(true);
    setEmail("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    navigate("/signup", { replace: true });
  };

  // Function to switch to login and update URL
  const switchToLogin = () => {
    setIsSignUp(false);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setActiveTab("magic-link");
    navigate("/login", { replace: true });
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isResetPassword
                  ? "Reset Password"
                  : isSignUp
                      ? "Create Account"
                      : "Welcome Back"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isResetPassword ? (
                <div className="space-y-4">
                  {!otpSent ? (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <Input
                            label="Email"
                            id="resetEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                          {loading ? "Sending..." : "Send Reset OTP"}
                        </Button>
                        <div className="text-center">
                          <button
                              type="button"
                              onClick={() => setIsResetPassword(false)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Back to login
                          </button>
                        </div>
                      </form>
                  ) : !otpVerified ? (
                      <form onSubmit={verifyResetOtp} className="space-y-4">
                        <div className="text-center mb-4">
                          <p className="text-sm text-gray-600">
                            We've sent a password reset OTP to <strong>{email}</strong>.
                            Please enter it below.
                          </p>
                        </div>

                        <div className="flex flex-col items-center">
                          <h3 className="text-xl font-medium mb-2">OTP input (spaced)</h3>
                          <OtpInput
                              length={6}
                              value={otp}
                              onChange={setOtp}
                          />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                          {loading ? "Verifying..." : "Verify OTP"}
                        </Button>

                        <div className="text-center">
                          {resendTimer > 0 ? (
                              <p className="text-sm text-gray-600">
                                Resend OTP in {resendTimer} seconds
                              </p>
                          ) : (
                              <button
                                  type="button"
                                  onClick={handleResetPassword}
                                  disabled={loading}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                Resend OTP
                              </button>
                          )}
                        </div>
                      </form>
                  ) : (
                      <form onSubmit={updatePassword} className="space-y-4">
                        <Input
                            label="New Password"
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <Input
                            label="Confirm New Password"
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                          {loading ? "Updating..." : "Update Password"}
                        </Button>
                      </form>
                  )}
                </div>
            ) : isSignUp ? (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                    <Input
                        label="Last Name"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                  </div>
                  <Input
                      label="Email"
                      id="signUpEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                  />
                  <Input
                      label="Password"
                      id="signUpPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                  />
                  <div className="w-full flex flex-row gap-2 items-center justify-start">
                  <Input
                      id="acceptTerms"
                      type="checkbox"
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      required
                      minLength={6}
                      className="w-5 h-5"
                  />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                      I accept the <a href="/terms-of-service" className="underline">terms of services</a>
                    </label>
                  </div>
                  <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                  <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={switchToLogin}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="magic-link">Magic Link / OTP</TabsTrigger>
                    <TabsTrigger value="password">Email & Password</TabsTrigger>
                  </TabsList>

                  <TabsContent value="magic-link" className="space-y-4">
                    {!otpSent ? (
                        <form onSubmit={sendMagicLink} className="space-y-4">
                          <Input
                              label="Email"
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                          />
                          <Button
                              type="submit"
                              className="w-full"
                              disabled={loading}
                          >
                            {loading ? "Sending..." : "Send Magic Link & OTP"}
                          </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                          <div className="text-center mb-4">
                            <p className="text-sm text-gray-600">
                              We've sent a magic link to <strong>{email}</strong>.
                              Click the link in your email or enter the OTP below.
                            </p>
                          </div>

                          <form onSubmit={verifyOtp} className="space-y-4">
                            <div className="flex flex-col items-center">
                              <OtpInput
                                  length={6}
                                  value={otp}
                                  onChange={setOtp}
                              />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                              {loading ? "Verifying..." : "Verify OTP"}
                            </Button>
                          </form>

                          <div className="text-center">
                            {resendTimer > 0 ? (
                                <p className="text-sm text-gray-600">
                                  Resend OTP in {resendTimer} seconds
                                </p>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="text-sm"
                                    onClick={resendOtp}
                                    disabled={loading}
                                >
                                  Resend OTP
                                </Button>
                            )}
                          </div>
                        </div>
                    )}
                  </TabsContent>

                  <TabsContent value="password" className="space-y-4">
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      <Input
                          label="Email"
                          id="passwordEmail"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                      />
                      <Input
                          label="Password"
                          id="passwordInput"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                      />
                      <Button
                          type="submit"
                          className="w-full"
                          disabled={loading}
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                      <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                              setIsResetPassword(true);
                              setOtpSent(false);
                              setOtpVerified(false);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
            )}

            {!isSignUp && !isResetPassword && (
                <div className="mt-6 text-center">
                  <button
                      type="button"
                      onClick={switchToSignUp}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Don't have an account? Sign up
                  </button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default Login;