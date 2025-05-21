import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddPaymentMethod from "../Onboarding/addPaymentMethod";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const SubscriptionSettings = ({ contractor }) => {
  const queryClient = useQueryClient();

  const plans = [
    {
      key: "pioneer",
      title: "Pioneer",
      pricing: ".01 - .03",
      features: [
        "Up to 2 team members",
        "Unlimited leads",
        "Whitelabel custom app",
        "Capture client signature",
        "Personalized ai pricing & rules",
        "24/7 email support",
      ],
      buttonText: "Select Plan",
    },
    {
      key: "enterprise",
      title: "Enterprise",
      pricing: "",
      features: [
        "Everything in PIONEER +",
        "Use your own domain",
        "Unlimited team members",
        "Unlimited API & Webhook access",
        "Custom integrations",
        "Personalized onboarding & marketing support",
        "24/7 priority support",
      ],
      buttonText: "Schedule a call",
    },
  ];

  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Loading states
  const [isLoadingPioneer, setIsLoadingPioneer] = useState(false);
  const [isLoadingEnterprise, setIsLoadingEnterprise] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Payment related states
  const [clientSecret, setClientSecret] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [customerId, setCustomerId] = useState("");

  // State to hold the refreshed contractor data
  const [refreshedContractor, setRefreshedContractor] = useState(null);
  
  // Effect to use either the refreshed data or the prop data
  useEffect(() => {
    if (!refreshedContractor && contractor) {
      setRefreshedContractor(contractor);
    }
  }, [contractor, refreshedContractor]);
  
  // Function to fetch fresh contractor data
  const refreshContractorData = async () => {
    try {
      // Get the current contractor from the database
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", contractor.id)
        .single();

      if (error) throw error;
      
      setRefreshedContractor(data);
      return data;
    } catch (error) {
      console.error("Error refreshing contractor data:", error);
      return null;
    }
  };
  
  const handleOnClick = async (planKey) => {
    setSelectedPlan(planKey);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlan = async () => {
    setIsConfirmLoading(true);
    try {
      if (selectedPlan === "enterprise") {
        await handleEnterpriseConfirm();
      } else if (selectedPlan === "pioneer") {
        await handlePioneerConfirm();
      }
    } catch (error) {
      console.error("Error during plan confirmation:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Enterprise plan handling - just send email
  const handleEnterpriseConfirm = async () => {
    setIsLoadingEnterprise(true);
    try {
      await refreshContractorData();
      const currentContractor = refreshedContractor || contractor;
      
      const { error } = await supabase.functions.invoke("enterprise-plan-notification", {
        body: {
          customerInfo: {
            fullName: currentContractor.full_name || currentContractor.business_name,
            email: currentContractor.contact_email,
            phone: currentContractor.contact_phone,
            address: currentContractor.business_address,
          }
        }
      });

      if (error) {
        console.error("Error sending enterprise notification:", error);
        toast({
          title: "Error",
          description: "Failed to send enterprise notification. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Request Sent",
          description: "Our team will contact you soon about the Enterprise plan.",
        });
      }
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEnterprise(false);
    }
  };

  // Pioneer plan handling - check Stripe status
  const handlePioneerConfirm = async () => {
    setIsLoadingPioneer(true);
    try {
      // Refresh data first to ensure we have the latest
      await refreshContractorData();
      const currentContractor = refreshedContractor || contractor;
      
      // Check if contractor has a Stripe customer ID
      if (!currentContractor.stripe_customer_id) {
        // Create a new Stripe customer
        const { data, error } = await supabase.functions.invoke("create-stripe-customer", {
          body: {
            email: currentContractor.contact_email,
            name: currentContractor.full_name || currentContractor.business_name,
            metadata: {
              contractorId: currentContractor.id
            }
          }
        });

        if (error) {
          throw new Error(error.message || "Failed to create Stripe customer");
        }

        // Update contractor with new Stripe customer ID
        const { error: updateError } = await supabase
          .from("contractors")
          .update({ stripe_customer_id: data.customer.id })
          .eq("id", currentContractor.id);

        if (updateError) {
          throw new Error(updateError.message || "Failed to update contractor");
        }

        setCustomerId(data.customer.id);
        // Create a setup intent for the new customer
        await createSetupIntent(data.customer.id);
      } else {
        // Check if the customer has a payment method
        const { data, error } = await supabase.functions.invoke('get-payment-methods', {
          body: {
            customer_id: currentContractor.stripe_customer_id,
          },
        });

        if (error) {
          throw new Error(error.message || "Failed to check payment method");
        }

        if (data.paymentMethods.data.length > 0) {
          // Customer already has a payment method, update tier
          await updateToPioneerTier();
        } else {
          // Customer needs to add a payment method
          await createSetupIntent(contractor.stripe_customer_id);
        }
      }
    } catch (err) {
      console.error("Error handling Pioneer plan:", err);
      toast({
        title: "Error",
        description: err.message || "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPioneer(false);
    }
  };

  // Create a setup intent and show payment form
  const createSetupIntent = async (customerId) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-client-secret', {
        body: { customerId: customerId }
      });

      if (error) {
        throw new Error(error.message || "Failed to create setup intent");
      }

      setClientSecret(data.client_secret);
      setIsPaymentModalOpen(true);
    } catch (err) {
      console.error("Error creating setup intent:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to prepare payment method setup",
        variant: "destructive",
      });
    }
  };

  // Update contractor tier to pioneer
  const updateToPioneerTier = async () => {
    try {
      const { error: updateError } = await supabase
        .from("contractors")
        .update({ tier: "pioneer" })
        .eq("id", contractor.id);

      if (updateError) {
        throw new Error(updateError.message || "Failed to update tier");
      }

      // Refresh the contractor data to get the latest tier
      await refreshContractorData();

      await queryClient.invalidateQueries({ queryKey: ["contractor"] });
      await queryClient.refetchQueries({ queryKey: ["contractor"] });

      //window.location.reload();

      toast({
        title: "Success",
        description: "Your plan has been updated to Pioneer!",
      });

    } catch (err) {
      console.error("Error updating tier:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update your plan",
        variant: "destructive",
      });
    }
  };

  // Handle payment form submission
  const handlePaymentSubmit = async () => {
    await updateToPioneerTier();
    
    // Refresh contractor data again
    await refreshContractorData();

    await queryClient.invalidateQueries({ queryKey: ["contractor"] });
    await queryClient.refetchQueries({ queryKey: ["contractor"] });

    window.location.reload();
  };

  // Handle back button in payment form
  const handlePaymentBack = () => {
    setIsPaymentModalOpen(false);
  };

  // Determine if a button should be disabled
  const isButtonDisabled = (planKey) => {
    const currentTier = (refreshedContractor || contractor)?.tier;
    if (currentTier === planKey) return true;
    if (planKey === "pioneer" && isLoadingPioneer) return true;
    if (planKey === "enterprise" && isLoadingEnterprise) return true;
    return isLoadingPioneer || isLoadingEnterprise || isConfirmLoading;
  };

  // Loader component for buttons
  const ButtonLoader = () => (
    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
  );

  return (
    <div className="space-y-4">
      <h1>Subscriptions</h1>
      <div>
        <span>
          <strong>Current Plan:</strong>{" "}
          {(refreshedContractor || contractor)?.tier?.charAt(0).toUpperCase() + 
           (refreshedContractor || contractor)?.tier?.slice(1)}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`flex flex-col rounded-lg p-4 md:p-8 border border-gray-200 
              ${(refreshedContractor || contractor)?.tier === plan.key ? "opacity-50" : "opacity-100"}
              ${plan.key === "pioneer" ? "bg-white" : "bg-gray-100"}
              `}
          >
            <div className="mb-4 md:mb-6 flex flex-col gap-5">
              <div className="flex gap-3 items-center">
                <h3 className="text-lg md:text-2xl font-bold">{plan.title}</h3>

                {plan.key === "enterprise" && (
                  <div
                    className={`bg-white text-green-400 rounded-full py-1 px-3 text-[10px] md:text-sm font-semibold`}
                  >
                    <span>Unlimited</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-black text-4xl font-bold">{plan.pricing}</p>
                {plan.key === "pioneer" ? (
                  <p>Subtotal Volume</p>
                ) : (
                  <p>Talk to Sales</p>
                )}
              </div>
            </div>

            <div className="min-w-[100%] border-b border-gray-200 mb-8"></div>

            <div className="flex-grow">
              <ul className="space-y-2 md:space-y-4 text-sm md:text-base">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-5 flex-shrink-0">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleOnClick(plan.key)}
              disabled={isButtonDisabled(plan.key)}
              className="mt-6 md:mt-8 w-full py-2 md:py-3 px-4 rounded-md text-center font-medium
                bg-white text-black border border-gray-300 
                hover:bg-primary hover:text-white hover:border-primary
                transition-colors duration-200 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-gray-300
                flex items-center justify-center"
            >
              {(plan.key === "pioneer" && isLoadingPioneer) || (plan.key === "enterprise" && isLoadingEnterprise) ? (
                <>
                  <ButtonLoader />
                  Processing...
                </>
              ) : (
                plan.buttonText
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => !isConfirmLoading && setShowConfirmDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
            <DialogDescription>
              {selectedPlan === "enterprise" 
                ? "Our team will contact you to discuss enterprise options." 
                : "You are about to switch to the Pioneer plan. You will be asked to provide payment information if not already on file."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isConfirmLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPlan}
              disabled={isConfirmLoading}
            >
              {isConfirmLoading ? (
                <>
                  <ButtonLoader />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog 
        open={isPaymentModalOpen} 
        onOpenChange={(open) => !isLoadingPioneer && setIsPaymentModalOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Please add a payment method to continue with the Pioneer plan.
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <AddPaymentMethod
              customerName={(refreshedContractor || contractor).full_name || (refreshedContractor || contractor).business_name}
              customerId={(refreshedContractor || contractor).stripe_customer_id || customerId}
              clientSecret={clientSecret}
              setCurrentStep={setCurrentStep}
              handleSubmit={handlePaymentSubmit}
              handleBack={handlePaymentBack}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};