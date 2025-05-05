import React, { useState } from 'react'
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

const stripePromise = loadStripe('pk_live_51R7hjJGwj3ICel7hmb3HTrIvr2S5nedArorTgkCOCXTR0r4OYKipT97wocqM1Hn7ROTpWpUo9MneLWhbawaLYaGZ00o1rpH1Ol')

function PaymentForm({ customerName, clientSecret, setCurrentStep }: { customerName: string, clientSecret: string, setCurrentStep: React.Dispatch<React.SetStateAction<any>> }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  console.log("CLIENT DETAILS:", customerName, clientSecret);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
  
    if (!stripe || !elements) {
      setError('Stripe has not loaded.')
      setLoading(false)
      return
    }
  
    const cardNumberElement = elements.getElement(CardNumberElement)
    if (!cardNumberElement) {
      setError('Card number element not found.')
      setLoading(false)
      return
    }
  
    // 1. Create payment method from card elements
    const paymentMethodResult = await stripe.createPaymentMethod({
      type: 'card',
      card: cardNumberElement,
      billing_details: {
        name: customerName,
      },
    })
  
    if (paymentMethodResult.error) {
      setError(paymentMethodResult.error.message || 'Failed to create payment method')
      setLoading(false)
      return
    }
  
    // 2. Confirm card setup using payment method
    const confirmResult = await stripe.confirmCardSetup(clientSecret, {
      payment_method: paymentMethodResult.paymentMethod.id,
    })
  
    if (confirmResult.error) {
      setError(confirmResult.error.message || 'Failed to confirm card setup')
    } else {
      setSuccess(true)
    }
  
    setLoading(false)
  }
  
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
    <form onSubmit={handleSubmit} className="space-y-4">
  <label className="block text-sm font-medium text-gray-700">Card Details</label>

  {/* Card Number */}
  <div className="border border-gray-300 rounded-md p-3 bg-white">
    <CardNumberElement options={ELEMENT_OPTIONS} />
  </div>

  {/* Expiry + CVC in same row */}
  <div className="flex gap-4">
    <div className="flex-1 border border-gray-300 rounded-md p-3 bg-white">
      <CardExpiryElement options={ELEMENT_OPTIONS} />
    </div>
    <div className="flex-1 border border-gray-300 rounded-md p-3 bg-white">
      <CardCvcElement options={ELEMENT_OPTIONS} />
    </div>
  </div>

  {error && <p className="text-red-500">{error}</p>}
  {success && <p className="text-green-500">Payment method saved!</p>}

  <div className="mt-6 text-xs text-center text-gray-500">
    <p>Your payment information is securely processed by Stripe.</p>
    <p>By adding a payment method, you agree to our Terms of Service and Privacy Policy.</p>
  </div>

  <div className="flex justify-between pt-6">
    <Button
      variant="ghost"
      onClick={() => setCurrentStep(2)}
      disabled={loading}
      className="text-[17px] font-medium text-muted-foreground hover:text-foreground"
    >
      Back
    </Button>
    <Button
      type='submit'
      disabled={!stripe || loading}
      className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
    >
      {loading ? "Saving..." : "Confirm"}
    </Button>
  </div>

</form>
  )
}

export default function AddPaymentMethod({ customerName, clientSecret, setCurrentStep }: { customerName: string, clientSecret: string, setCurrentStep: React.Dispatch<React.SetStateAction<any>> }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm customerName={customerName} clientSecret={clientSecret} setCurrentStep={setCurrentStep}/>
    </Elements>
  )
}
