const VALID_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'cancelled', 'past_due', 'incomplete'] as const

export type SubscriptionStatus = (typeof VALID_SUBSCRIPTION_STATUSES)[number]

export function getSubscriptionStatus(status: string): SubscriptionStatus {
  const normalized = String(status || '').trim().toLowerCase()

  const mapped = (() => {
    switch (normalized) {
      case 'active':
        return 'active'
      case 'trialing':
      case 'trial_active':
      case 'trial':
        return 'trialing'
      case 'canceled':
      case 'cancelled':
        return 'cancelled'
      case 'cancel_at_period_end':
        return 'active'
      case 'past_due':
        return 'past_due'
      case 'incomplete':
        return 'incomplete'
      case 'unpaid':
        return 'past_due'
      default:
        return 'incomplete'
    }
  })()

  if (!VALID_SUBSCRIPTION_STATUSES.includes(mapped)) {
    return 'incomplete'
  }

  return mapped
}
