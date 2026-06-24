import SubscriptionPlans from '../../../components/Subscription/SubscriptionPlans'

export default function OnboardingPlan() {
  return (
    <div className="app-page">
      <div className="mx-auto max-w-6xl">
        <div className="course-card mb-8 rounded-md p-6 text-white shadow-2xl md:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-white/75">Membership</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">Choose your playing plan</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Pick the rhythm that fits your season. Every paid plan includes score tracking, draw access, and charity contributions.
          </p>
        </div>
        <SubscriptionPlans />
      </div>
    </div>
  )
}
