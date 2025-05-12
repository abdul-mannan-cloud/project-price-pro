import React, { useState, useEffect } from 'react'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '../ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useLocation } from 'react-router-dom' // Import from react-router-dom

const stripePromise = loadStripe('pk_test_51R7hjJGwj3ICel7hM1235wRDn3lEBEvmYkURzopLYmPpyQa91vdv6HTHffkG5EZFlJBD8v2ruWEhDCknbG8XJn3B00jVdJp7dy')

function PaymentForm({ customerName, customerId, clientSecret, setCurrentStep, handleSubmit }: { customerName: string, customerId: string, clientSecret: string, setCurrentStep: React.Dispatch<React.SetStateAction<any>>, handleSubmit: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardComplete, setCardComplete] = useState({
    cardNumber: false,
    cardExpiry: false,
    cardCvc: false
  })
  
  // Get current location using React Router
  const location = useLocation()
  
  // Check if we're on the settings page
  const isSettingsPage = location.pathname.includes('/settings')
  
  // Calculate if the form is ready to submit
  const isFormComplete = cardComplete.cardNumber && cardComplete.cardExpiry && cardComplete.cardCvc

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setIsProcessing(true)
    setError('')
    setSuccess(false)
  
    if (!stripe || !elements) {
      setError('Stripe has not loaded.')
      setLoading(false)
      setIsProcessing(false)
      return
    }
  
    const cardNumberElement = elements.getElement(CardNumberElement)
    if (!cardNumberElement) {
      setError('Card number element not found.')
      setLoading(false)
      setIsProcessing(false)
      return
    }
  
    try {
      // 1. Create payment method from card elements
      const paymentMethodResult = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: customerName,
        },
      })
    
      if (paymentMethodResult.error) {
        throw new Error(paymentMethodResult.error.message || 'Failed to create payment method')
      }
    
      // 2. Confirm card setup using payment method
      const confirmResult = await stripe.confirmCardSetup(clientSecret, {
        payment_method: paymentMethodResult.paymentMethod.id,
      })
      
      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Failed to confirm card setup')
      }
    
      // 3. Attach payment method to customer
      const { data, error: attachError } = await supabase.functions.invoke('attach-payment-method', {
        body: {
          customerId: customerId,
          paymentMethodId: paymentMethodResult.paymentMethod.id,
        }
      })
      
      if (attachError) {
        throw new Error(attachError.message || 'Failed to attach payment method to customer')
      }
      
      // Everything succeeded
      setSuccess(true)
      
      // Call the parent's handleSubmit after a short delay to show the success message
      setTimeout(() => {
        handleSubmit();
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment processing')
    } finally {
      setLoading(false)
      setIsProcessing(false)
    }
  }
  
  // Track the completion status of each card element
  const handleCardChange = (event: any, elementType: 'cardNumber' | 'cardExpiry' | 'cardCvc') => {
    setCardComplete(prev => ({
      ...prev,
      [elementType]: event.complete
    }));
  };
  
  const ELEMENT_OPTIONS = {
    style: {
      base: {
        fontSize: '16px',
        color: '#000000',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#888',
        },
      },
      invalid: {
        color: '#e5424d',
      },
    },
    hidePostalCode: true,
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Card Details</label>
      <div className='flex flex-col rounded-md border border-gray-300'>
        <div className="p-3 bg-white rounded-t-md border-b border-gray-300">
          <CardNumberElement 
            options={ELEMENT_OPTIONS} 
            onChange={(e) => handleCardChange(e, 'cardNumber')}
          />
        </div>

        <div className="flex">
          <div className="flex-1 p-3 border-r border-gray-300">
            <CardExpiryElement 
              options={ELEMENT_OPTIONS} 
              onChange={(e) => handleCardChange(e, 'cardExpiry')}
            />
          </div>
          <div className="flex-1 p-3">
            <CardCvcElement 
              options={ELEMENT_OPTIONS} 
              onChange={(e) => handleCardChange(e, 'cardCvc')}
            />
          </div>
        </div>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">Payment method saved successfully!</p>}

      <div className="mt-6 text-xs text-center text-gray-500">
        <p>Your payment information is securely processed by Stripe.</p>
        <p>By adding a payment method, you agree to our Terms of Service and Privacy Policy.</p>
      </div>

      <div className={`flex ${isSettingsPage ? 'justify-end' : 'justify-between'} pt-6`}>
        {!isSettingsPage && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(2)}
            disabled={loading || isProcessing}
            className="text-[17px] font-medium text-muted-foreground hover:text-foreground"
          >
            Back
          </Button>
        )}
        <Button
          type='submit'
          disabled={!stripe || loading || isProcessing || !isFormComplete || success}
          className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
        >
          {loading || isProcessing ? "Processing..." : success ? "Verified" : "Confirm"}
        </Button>
      </div>

    </form>
  )
}

export default function AddPaymentMethod({ customerName, customerId, clientSecret, setCurrentStep, handleSubmit }: { customerName: string, customerId: string, clientSecret: string, setCurrentStep: React.Dispatch<React.SetStateAction<any>>, handleSubmit: () => void }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm customerName={customerName} customerId={customerId} clientSecret={clientSecret} setCurrentStep={setCurrentStep} handleSubmit={handleSubmit}/>
    </Elements>
  )
}