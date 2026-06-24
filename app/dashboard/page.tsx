import { redirect } from 'next/navigation'
import DashboardPageClient from '../../components/Dashboard/DashboardPageClient'
import { getUserRole } from '../../lib/getUserRole'

export default async function DashboardPage() {
  const { isAuthenticated, role } = await getUserRole()

  if (!isAuthenticated) redirect('/login')
  if (role === 'admin') redirect('/admin')

  return <DashboardPageClient />
}
