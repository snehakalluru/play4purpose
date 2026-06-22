import ScoreForm from '../../../components/Scores/ScoreForm'

export default function SubmitScorePage() {
  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-6">Submit Score</h1>
        <ScoreForm />
      </div>
    </div>
  )
}
