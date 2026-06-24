import RegisterForm from '../../components/Auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md premium-gradient font-black text-white shadow-lg">
            P4
          </div>
          <p className="section-eyebrow">Start playing</p>
          <h1 className="mt-2 text-3xl font-black">Create account</h1>
        </div>
        <div className="brutal-card ticket-card p-6">
        <RegisterForm />
        </div>
      </div>
    </div>
  )
}
