import EntryForm from '../../../components/Draw/EntryForm'
import ActiveDraw from '../../../components/Draw/ActiveDraw'

export default function EnterDrawPage() {
  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-6">Enter Current Draw</h1>
        <ActiveDraw />
        <EntryForm />
      </div>
    </div>
  )
}
