import DashboardSidebar from '../../components/Dashboard/Sidebar'
import DashboardHeader from '../../components/Dashboard/Header'
import DashboardOverview from '../../components/Dashboard/Overview'
import { supabaseAdmin } from '../../services/supabaseAdmin'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value || cookieStore.get('supabase-auth-token')?.value || ''

  let data = {
    full_name: 'Member',
    charity: { name: '-' },
    contribution_percentage: 10,
    subscription: { status: 'inactive', plan_type: null, current_period_end: null }
  }

  if (accessToken) {
    try {
      const { data: userResp } = await supabaseAdmin.auth.getUser(accessToken)
      const user = userResp?.user
      if (user) {
        const userId = user.id
        const [{ data: profile }, { data: charityRow }, { data: subscription }] = await Promise.all([
          supabaseAdmin.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
          supabaseAdmin
            .from('user_charities')
            .select('contribution_percentage,charities(name)')
            .eq('user_id', userId)
            .limit(1)
            .single()
            .then((r) => r || { data: null }),
          supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).limit(1).single().then((r) => r || { data: null })
        ])
        const charity = Array.isArray(charityRow?.charities) ? charityRow?.charities[0] : charityRow?.charities

        data = {
          full_name: profile?.full_name ?? user.user_metadata?.first_name ?? 'Member',
          charity: charity ?? { name: '-' },
          contribution_percentage: charityRow?.contribution_percentage ?? 10,
          subscription: subscription ?? { status: 'inactive' }
        }
      }
    } catch (e) {
      // fallback to placeholder
    }
  }

  return (
    <div className="min-h-screen bg-background text-white flex">
      <DashboardSidebar />
      <main className="flex-1 p-6">
        <DashboardHeader name={data.full_name} />
        <div className="mt-6">
          <DashboardOverview data={data} />
        </div>
      </main>
    </div>
  )
}