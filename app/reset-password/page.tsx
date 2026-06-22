import ResetPasswordForm from '../../components/Auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 bg-surface rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl mb-4">Reset your password</h1>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
