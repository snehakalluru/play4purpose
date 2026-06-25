const VALID_SUBSCRIPTION_STATUSES = ['active', 'trial_active', 'expired'] as const

export type SubscriptionStatus = (typeof VALID_SUBSCRIPTION_STATUSES)[number]

export function normalizeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  if (!stripeStatus) return 'expired'

  const status = stripeStatus.toLowerCase().trim()

  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trial_active',
    trial_active: 'trial_active',
    canceled: 'expired',
    cancelled: 'expired',
    cancel_at_period_end: 'active',
    past_due: 'expired',
    unpaid: 'expired',
    incomplete: 'expired',
    incomplete_expired: 'expired',
    lapsed: 'expired',
    expired: 'expired'
  }

  const normalized = map[status] || 'expired'

  if (!VALID_SUBSCRIPTION_STATUSES.includes(normalized)) {
    return 'expired'
  }

  return normalized
}

export function assertValidSubscriptionStatus(status: unknown): asserts status is SubscriptionStatus {
  if (!status || typeof status !== 'string') {
    throw new Error('Invalid subscription status')
  }

  const normalized = status.toLowerCase().trim()
  if (normalized !== status || !VALID_SUBSCRIPTION_STATUSES.includes(normalized as SubscriptionStatus)) {
    throw new Error('Invalid subscription status')
  }
}

export const getSubscriptionStatus = normalizeSubscriptionStatus
