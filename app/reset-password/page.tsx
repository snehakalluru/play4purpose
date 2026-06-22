import ResetPasswordForm from '../../components/Auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="brutal-card w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 uppercase tracking-tight">Set new password</h1>
        <ResetPasswordForm />
      </div>
    </div>
  )
}