import ForgotPasswordForm from '../../components/Auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="brutal-card w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 uppercase tracking-tight">Reset password</h1>
        <p className="mb-6 text-sm font-bold opacity-70">
          Enter your email and we will send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}