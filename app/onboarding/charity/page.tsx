import CharityOnboardingClient from '../../../components/Onboarding/CharityOnboardingClient'

export default function OnboardingCharity() {
  return (
    <div className="min-h-screen p-8 bg-background text-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-6">Choose a charity</h1>
        <CharityOnboardingClient />
      </div>
    </div>
  )
}
