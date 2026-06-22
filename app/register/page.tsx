import RegisterForm from '../../components/Auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 bg-surface rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl mb-4">Create your account</h1>
        <RegisterForm />
      </div>
    </div>
  )
}
