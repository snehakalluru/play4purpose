import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'
import { assertValidSubscriptionStatus, normalizeSubscriptionStatus } from '../../../lib/subscriptionStatus'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userResp.user.id

    let { data, error } = await supabaseAdmin
      .from('user_dashboard_view')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // If view doesn't exist, build profile manually
    if (error || !data) {
      const [{ data: profile }, { data: subscription }] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      data = {
        user_id: userId,
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        role: profile?.role || 'user',
        profile_subscription_status: profile?.subscription_status || 'trial_active',
        profile_trial_end: profile?.trial_end || null,
        profile_trial_end_date: profile?.trial_end_date || null,
        profile_created_at: profile?.created_at || null,
        subscription_id: subscription?.id || null,
        subscription_status: subscription?.status || 'trial_active',
        is_trial: subscription?.is_trial ?? true,
        subscription_trial_end: subscription?.trial_end || null,
        subscription_trial_end_date: subscription?.trial_end_date || null,
        started_at: subscription?.started_at || null
      }
    }

    if (!data) {
      const [{ data: profile }, { data: subscription }] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      let ensuredProfile = profile
      let ensuredSubscription = subscription

      if (!ensuredProfile) {
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7)
        const trialEndDateSql = trialEndDate.toISOString().slice(0, 10)

        const { data: createdProfile, error: profileCreateError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            full_name: userResp.user.user_metadata?.full_name || null,
            role: 'user',
            subscription_status: 'trial_active',
            trial_end: trialEndDateSql,
            trial_end_date: trialEndDateSql
          }, { onConflict: 'id' })
          .select('*')
          .maybeSingle()

        if (profileCreateError) return NextResponse.json({ error: profileCreateError.message }, { status: 500 })
        ensuredProfile = createdProfile
      }

      if (!ensuredSubscription) {
        const trialEndDateSql = (ensuredProfile?.trial_end || ensuredProfile?.trial_end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        const subscriptionStatus = normalizeSubscriptionStatus('trialing')
        console.log('SUBSCRIPTION STATUS BEFORE INSERT:', subscriptionStatus)
        assertValidSubscriptionStatus(subscriptionStatus)

        const { data: createdSubscription, error: subscriptionCreateError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'monthly',
            status: normalizeSubscriptionStatus(subscriptionStatus),
            is_trial: true,
            trial_end: trialEndDateSql,
            trial_end_date: trialEndDateSql,
            renewal_date: trialEndDateSql,
            started_at: new Date().toISOString()
          })
          .select('*')
          .maybeSingle()

        if (subscriptionCreateError) return NextResponse.json({ error: subscriptionCreateError.message }, { status: 500 })
        ensuredSubscription = createdSubscription
      }

      let selectedCharity = null
      let charityData = null
      try {
        const charityResult = await supabaseAdmin
          .from('user_charities')
          .select('id,user_id,charity_id,contribution_percentage,charities(id,name,description,image_url,logo_url,events)')
          .eq('user_id', userId)
          .maybeSingle()
        selectedCharity = charityResult.data

        const selectedCharityRow = Array.isArray((selectedCharity as any)?.charities)
          ? (selectedCharity as any).charities[0]
          : (selectedCharity as any)?.charities

        if (selectedCharityRow) {
          charityData = selectedCharityRow
        } else if (ensuredProfile.charity_id) {
          const charityResult2 = await supabaseAdmin
            .from('charities')
            .select('id,name,description,image_url,events')
            .eq('id', ensuredProfile.charity_id)
            .maybeSingle()
          charityData = charityResult2.data
        }
      } catch (err) {
        console.error('Profile charity lookup error:', err)
      }

      const syntheticSubscription = ensuredSubscription || (ensuredProfile.subscription_status ? {
        id: null,
        user_id: ensuredProfile.id,
        plan_type: 'monthly',
        status: ensuredProfile.subscription_status,
        is_trial: ensuredProfile.subscription_status === 'trial_active',
        trial_end: ensuredProfile.trial_end || ensuredProfile.trial_end_date || ensuredProfile.created_at,
        trial_end_date: ensuredProfile.trial_end_date || ensuredProfile.trial_end || ensuredProfile.created_at,
        renewal_date: ensuredProfile.trial_end_date || ensuredProfile.trial_end || null,
        started_at: ensuredProfile.created_at,
        expires_at: ensuredProfile.trial_end_date || ensuredProfile.trial_end || null,
        current_period_start: ensuredProfile.created_at,
        current_period_end: ensuredProfile.trial_end_date || ensuredProfile.trial_end || null
      } : null)

      return NextResponse.json({
        ok: true,
        data: {
          profile: {
            id: ensuredProfile.id,
            full_name: ensuredProfile.full_name,
            phone: ensuredProfile.phone,
            role: ensuredProfile.role,
            charity_id: selectedCharity?.charity_id || ensuredProfile.charity_id || null,
            contribution_percentage: selectedCharity?.contribution_percentage || ensuredProfile.contribution_percentage || null,
            subscription_status: ensuredProfile.subscription_status,
            trial_end: ensuredProfile.trial_end || ensuredProfile.trial_end_date,
            trial_end_date: ensuredProfile.trial_end_date || ensuredProfile.trial_end,
            privacy_accepted: ensuredProfile.privacy_accepted,
            terms_accepted: ensuredProfile.terms_accepted,
            created_at: ensuredProfile.created_at
          },
          subscription: syntheticSubscription,
          charity: charityData,
          user_charity: selectedCharity
        }
      })
    }

    const syntheticSubscription = data.subscription_id ? {
      id: data.subscription_id,
      user_id: data.user_id,
      plan_type: data.plan_type,
      status: data.subscription_status,
      is_trial: data.is_trial,
      trial_end: data.subscription_trial_end || data.subscription_trial_end_date || data.profile_trial_end || data.profile_trial_end_date,
      trial_end_date: data.subscription_trial_end_date || data.subscription_trial_end || data.profile_trial_end_date || data.profile_trial_end,
      renewal_date: data.renewal_date,
      started_at: data.started_at,
      expires_at: data.expires_at,
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end
    } : (data.profile_subscription_status ? {
      id: null,
      user_id: data.user_id,
      plan_type: 'monthly',
      status: data.profile_subscription_status,
      is_trial: data.profile_subscription_status === 'trial_active',
      trial_end: data.profile_trial_end || data.profile_trial_end_date || data.profile_created_at,
      trial_end_date: data.profile_trial_end_date || data.profile_trial_end || data.profile_created_at,
      renewal_date: data.profile_trial_end_date || data.profile_trial_end || null,
      started_at: data.profile_created_at,
      expires_at: data.profile_trial_end_date || data.profile_trial_end || null,
      current_period_start: data.profile_created_at,
      current_period_end: data.profile_trial_end_date || data.profile_trial_end || null
    } : null)

    return NextResponse.json({
      ok: true,
      data: {
        profile: {
          id: data.user_id,
          full_name: data.full_name,
          phone: data.phone,
          role: data.role,
          charity_id: data.selected_charity_id || data.profile_charity_id || null,
          contribution_percentage: data.selected_contribution_percentage || data.profile_contribution_percentage || null,
          subscription_status: data.profile_subscription_status,
          trial_end: data.profile_trial_end || data.profile_trial_end_date,
          trial_end_date: data.profile_trial_end_date || data.profile_trial_end,
          privacy_accepted: data.privacy_accepted,
          terms_accepted: data.terms_accepted,
          created_at: data.profile_created_at
        },
        subscription: syntheticSubscription,
        charity: data.selected_charity_id ? {
          id: data.selected_charity_id,
          name: data.charity_name,
          description: data.charity_description,
          image_url: data.charity_image_url,
          events: data.charity_events
        } : null,
        user_charity: data.user_charity_id ? {
          id: data.user_charity_id,
          user_id: data.user_id,
          charity_id: data.selected_charity_id,
          contribution_percentage: data.selected_contribution_percentage,
          created_at: data.user_charity_created_at
        } : null
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
