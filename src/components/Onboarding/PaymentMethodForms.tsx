// PaymentMethodForm.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// interface PaymentMethodFormProps {
//   onComplete?: () => void;
// }

// interface CardDetails {
//   cardNumber: string;
//   cardExpiry: string;
//   cardCvc: string;
//   cardName: string;
// }

// interface StripeResponse {
//   success: boolean;
//   message: string;
//   customerId?: string;
//   paymentMethodId?: string;
//   last4?: string;
//   brand?: string;
//   error?: string;
// }

const PaymentMethodForm = ({ onComplete }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formattedValue = value
        .replace(/\s/g, '')
        .replace(/(\d{4})/g, '$1 ')
        .trim()
        .slice(0, 19); // 16 digits + 3 spaces
      
      setCardDetails(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    
    // Format expiry date with slash
    if (name === 'cardExpiry') {
      const expiry = value.replace(/\s/g, '').replace(/\//g, '');
      if (expiry.length > 4) return;
      
      const formattedExpiry = expiry.length > 2 
        ? `${expiry.slice(0, 2)}/${expiry.slice(2)}` 
        : expiry;
      
      setCardDetails(prev => ({ ...prev, [name]: formattedExpiry }));
      return;
    }
    
    // Limit CVC to 3-4 digits
    if (name === 'cardCvc') {
      const cvc = value.replace(/\D/g, '').slice(0, 4);
      setCardDetails(prev => ({ ...prev, [name]: cvc }));
      return;
    }
    
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const validateCardDetails = (): boolean => {
    // Validate card number (simple check for length after removing spaces)
    const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
    if (cardNumber.length < 15 || cardNumber.length > 16) {
      setError('Please enter a valid card number');
      return false;
    }
    
    // Validate expiry (MM/YY format)
    const expiry = cardDetails.cardExpiry;
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    // Check if card is expired
    const [month, year] = expiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const today = new Date();
    if (expiryDate < today) {
      setError('Card is expired');
      return false;
    }
    
    // Validate CVC (3-4 digits)
    if (!/^\d{3,4}$/.test(cardDetails.cardCvc)) {
      setError('Please enter a valid CVC (3-4 digits)');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    
    if (!validateCardDetails()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current user
      //const { data: { user } } = await supabase.auth.getUser();
      
      // if (!user) {
      //   toast({
      //     title: "Error",
      //     description: "No authenticated user found. Please log in again.",
      //     variant: "destructive",
      //   });
      //   navigate("/login");
      //   return;
      // }
      
      // Call Supabase Edge Function to create Stripe customer and attach payment method
      const { data, error } = await supabase.functions.invoke('attach-payment-method', {
        body: {
          name: 'Khizer',
          email: 'khizerch2001@gmail.com',
          paymentMethod: {
            card: {
              number: cardDetails.cardNumber.replace(/\s/g, ''),
              exp_month: parseInt(cardDetails.cardExpiry.split('/')[0]),
              exp_year: parseInt('20' + cardDetails.cardExpiry.split('/')[1]),
              cvc: cardDetails.cardCvc,
            },
            billing_details: {
              name: 'Khizer',
            }
          }
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to process payment method');
      }
      
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to process payment method');
      }
      
      // Update the contractor record with Stripe customer ID
    //   const { error: updateError } = await supabase
    //     .from('contractors')
    //     .update({ 
    //       stripe_customer_id: data.customerId,
    //       payment_method_id: data.paymentMethodId,
    //       payment_method_last4: data.last4,
    //       payment_method_brand: data.brand,
    //       payment_method_exp_month: parseInt(cardDetails.cardExpiry.split('/')[0]),
    //       payment_method_exp_year: parseInt('20' + cardDetails.cardExpiry.split('/')[1])
    //     })
    //     .eq('user_id', user.id);
      
    //   if (updateError) {
    //     console.error('Error updating contractor record:', updateError);
    //     // Continue anyway since the payment method was created successfully
    //   }
      
      toast({
        title: "Success",
        description: "Your payment method has been added successfully.",
      });
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      } else {
        navigate("/dashboard");
      }
      
    } catch (err: any) {
      console.error('Payment method error:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: "Error",
        description: err.message || 'Failed to add payment method',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        
        <Input
          id="cardNumber"
          name="cardNumber"
          label="Card Number"
          value={cardDetails.cardNumber}
          onChange={handleInputChange}
          required
          placeholder="4242 4242 4242 4242"
          inputMode="numeric"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="cardExpiry"
            name="cardExpiry"
            label="Expiry Date (MM/YY)"
            value={cardDetails.cardExpiry}
            onChange={handleInputChange}
            required
            placeholder="MM/YY"
            inputMode="numeric"
          />
          
          <Input
            id="cardCvc"
            name="cardCvc"
            label="CVC"
            value={cardDetails.cardCvc}
            onChange={handleInputChange}
            required
            placeholder="123"
            inputMode="numeric"
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : "Add Payment Method"}
        </Button>
      </div>
    </form>
  );
};

export default PaymentMethodForm;