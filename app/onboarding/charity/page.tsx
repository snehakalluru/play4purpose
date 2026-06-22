import CharitySelector from '../../../components/Charity/CharitySelector'

export default function OnboardingCharity() {
  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-6">Choose a charity</h1>
        <CharitySelector />
      </div>
    </div>
  )
}
