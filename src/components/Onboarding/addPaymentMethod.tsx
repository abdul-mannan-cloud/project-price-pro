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

const stripePromise = loadStripe('pk_live_51R7hjJGwj3ICel7hmb3HTrIvr2S5nedArorTgkCOCXTR0r4OYKipT97wocqM1Hn7ROTpWpUo9MneLWhbawaLYaGZ00o1rpH1Ol')

function PaymentForm({ customerName, clientSecret }: { customerName: string, clientSecret: string }) {
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

  <button
    type="submit"
    disabled={!stripe || loading}
    className="bg-blue-600 text-white px-4 py-2 rounded"
  >
    {loading ? 'Saving...' : 'Add Payment Method'}
  </button>

  {error && <p className="text-red-500">{error}</p>}
  {success && <p className="text-green-500">Payment method saved!</p>}
</form>
  )
}

export default function AddPaymentMethod({ customerName, clientSecret }: { customerName: string, clientSecret: string }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm customerName={customerName} clientSecret={clientSecret} />
    </Elements>
  )
}
