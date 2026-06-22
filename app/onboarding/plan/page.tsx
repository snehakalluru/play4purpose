import SubscriptionPlans from '../../../components/Subscription/SubscriptionPlans'

export default function OnboardingPlan() {
  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-6">Choose a plan</h1>
        <SubscriptionPlans />
      </div>
    </div>
  )
}
