import LoginForm from '../../components/Auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 bg-surface rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl mb-4">Sign in</h1>
        <LoginForm />
      </div>
    </div>
  )
}
