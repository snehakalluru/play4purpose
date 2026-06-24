import RegisterForm from '../../components/Auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="brutal-card w-full max-w-2xl">
        <h1 className="text-3xl font-black mb-6 uppercase tracking-tight">Create account</h1>
        <RegisterForm />
      </div>
    </div>
  )
}
