import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''

export const stripe = new Stripe(stripeSecret || 'sk_test_missing', { apiVersion: '2022-11-15' })

export function assertStripeConfigured() {
  if (!stripeSecret) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
}
