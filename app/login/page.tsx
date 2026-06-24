import LoginForm from '../../components/Auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md premium-gradient font-black text-white shadow-lg">
            P4
          </div>
          <p className="section-eyebrow">Welcome back</p>
          <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        </div>
        <div className="brutal-card ticket-card p-6">
        <LoginForm />
        </div>
      </div>
    </div>
  )
}
