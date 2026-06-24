import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export const stripe = new Stripe(stripeSecret || 'sk_test_missing', { apiVersion: '2022-11-15' })

export function assertStripeConfigured() {
  if (!stripeSecret) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
}

export function assertStripeWebhookConfigured() {
  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
}
