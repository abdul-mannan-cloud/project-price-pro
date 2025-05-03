// components/AddPaymentMethod.tsx
import React, { useState } from 'react'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe('')

function PaymentForm({ customerId }: { customerId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card element not found.')
      setLoading(false)
      return
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: 'Jane Doe', // Replace with real user input if needed
      },
    })

    if (error || !paymentMethod) {
      setError(error?.message || 'Failed to create payment method')
      setLoading(false)
      return
    }

    const res = await fetch('/functions/v1/attach-payment-method', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        customerId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to attach payment method')
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement />
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

export default function AddPaymentMethod({ customerId }: { customerId: string }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm customerId={customerId} />
    </Elements>
  )
}
