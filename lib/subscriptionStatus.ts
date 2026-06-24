const VALID_SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'lapsed', 'trialing', 'past_due', 'incomplete'] as const

export type SubscriptionStatus = (typeof VALID_SUBSCRIPTION_STATUSES)[number]

export function normalizeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  if (!stripeStatus) return 'incomplete'

  const status = stripeStatus.toLowerCase().trim()

  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    cancel_at_period_end: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete',
    lapsed: 'lapsed'
  }

  const normalized = map[status] || 'incomplete'

  if (!VALID_SUBSCRIPTION_STATUSES.includes(normalized)) {
    return 'incomplete'
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
