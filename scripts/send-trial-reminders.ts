import { Resend } from 'resend'
import { supabaseAdmin } from '../services/supabaseAdmin'
import { getSubscriptionStatus } from '../lib/subscriptionStatus'

async function main() {
  const target = new Date()
  target.setDate(target.getDate() + 2)
  const targetDate = target.toISOString().slice(0, 10)

  const { data: trials, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id,user_id,trial_end_date,profiles:user_id(full_name)')
    .eq('status', getSubscriptionStatus('trialing'))
    .eq('trial_end_date', targetDate)
    .is('trial_reminder_sent_at', null)

  if (error) throw error

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailsById = new Map((authUsers?.users || []).map((u) => [u.id, u.email || null]))

  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null
  const from = process.env.RESEND_FROM_EMAIL || 'Play4Purpose <hello@play4purpose.com>'

  for (const trial of trials || []) {
    const profile = Array.isArray((trial as any).profiles) ? (trial as any).profiles[0] : (trial as any).profiles
    const email = emailsById.get(trial.user_id)
    const fullName = profile?.full_name || 'there'

    if (resend && email) {
      await resend.emails.send({
        from,
        to: email,
        subject: 'Your Play4Purpose trial ends in 2 days',
        text: `Hi ${fullName}, your Play4Purpose trial ends on ${trial.trial_end_date}. Subscribe now from your dashboard to keep entering scores and prize draws.`
      })
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: trial.user_id,
      type: 'trial_reminder',
      title: 'Your trial ends in 2 days',
      message: `Subscribe before ${trial.trial_end_date} to keep playing.`
    })

    await supabaseAdmin
      .from('subscriptions')
      .update({ trial_reminder_sent_at: new Date().toISOString() })
      .eq('id', trial.id)
  }

  console.log(`Processed ${(trials || []).length} trial reminders for ${targetDate}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
