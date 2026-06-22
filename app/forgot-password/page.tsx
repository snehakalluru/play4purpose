import ForgotPasswordForm from '../../components/Auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 bg-surface rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl mb-4">Forgot your password</h1>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
