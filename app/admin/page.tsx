import { redirect } from 'next/navigation'
import AdminPageClient from '../../components/Admin/AdminPageClient'
import { getUserRole } from '../../lib/getUserRole'

export default async function AdminPage() {
  const { isAuthenticated, role } = await getUserRole()

  if (!isAuthenticated) redirect('/login')
  if (role !== 'admin') redirect('/dashboard')

  return <AdminPageClient />
}
