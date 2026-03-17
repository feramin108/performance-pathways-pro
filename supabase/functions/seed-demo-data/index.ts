import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const users = [
    {
      email: 'employee@bank.local', password: 'Demo@1234',
      meta: { full_name: 'Mbachan Fabrice Tanwan', username: 'employee' },
      profile: {
        employee_id: 'EMP-001', sex: 'M', department: 'IT', branch: '040',
        job_title: 'Information Security Officer', function_role: 'Information Security Officer',
        date_joining: '2024-01-15', occupied_since: '2024-01-15',
        academic_qualification: 'MSc in Cybersecurity', marital_status: 'single',
        employee_type: 'non_sales', ad_groups: ['IT', '040'],
      },
      role: 'employee',
    },
    {
      email: 'manager@bank.local', password: 'Demo@1234',
      meta: { full_name: 'James Okonkwo', username: 'manager' },
      profile: {
        employee_id: 'MGR-001', sex: 'M', department: 'GM', branch: '040',
        job_title: 'Head of IT', function_role: 'Head of IT',
        date_joining: '2020-03-01', employee_type: 'non_sales', ad_groups: ['GM', '040'],
      },
      role: 'manager',
    },
    {
      email: 'hc@bank.local', password: 'Demo@1234',
      meta: { full_name: 'Diane Fonkam', username: 'hc' },
      profile: {
        employee_id: 'HC-001', sex: 'F', department: 'HC', branch: '020',
        job_title: 'HC Officer', function_role: 'HC Officer',
        date_joining: '2019-06-01', employee_type: 'non_sales', ad_groups: ['HR', '020'],
      },
      role: 'hc',
    },
  ]

  const userIds: Record<string, string> = {}
  const results: any[] = []

  for (const u of users) {
    // Check if user already exists
    const { data: existingList } = await supabase.auth.admin.listUsers()
    const existing = existingList?.users?.find((x: any) => x.email === u.email)

    let userId: string
    if (existing) {
      userId = existing.id
      results.push({ email: u.email, status: 'exists', id: userId })
    } else {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: u.meta,
      })
      if (authErr) {
        results.push({ email: u.email, status: 'error', error: authErr.message })
        continue
      }
      userId = authData.user.id
      results.push({ email: u.email, status: 'created', id: userId })
    }
    userIds[u.email] = userId

    // Update profile
    await supabase.from('profiles').update({
      full_name: u.meta.full_name,
      ...u.profile,
    }).eq('id', userId)

    // Update role
    if (u.role !== 'employee') {
      await supabase.from('user_roles').update({ role: u.role }).eq('user_id', userId)
    }
  }

  // Set manager_id for employee
  if (userIds['employee@bank.local'] && userIds['manager@bank.local']) {
    await supabase.from('profiles').update({
      manager_id: userIds['manager@bank.local'],
    }).eq('id', userIds['employee@bank.local'])
  }

  // Seed evaluation for Fabrice
  const employeeId = userIds['employee@bank.local']
  const managerId = userIds['manager@bank.local']

  if (employeeId && managerId) {
    const { data: cycle } = await supabase.from('evaluation_cycles').select('id').eq('year', 2025).single()

    if (cycle) {
      // Check if evaluation already exists
      const { data: existingEval } = await supabase.from('evaluations')
        .select('id').eq('employee_id', employeeId).eq('cycle_id', cycle.id).maybeSingle()

      if (!existingEval) {
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

        const { data: evaluation } = await supabase.from('evaluations').insert({
          employee_id: employeeId,
          first_manager_id: managerId,
          cycle_id: cycle.id,
          employee_type: 'non_sales',
          status: 'submitted',
          stage_submitted_at: threeDaysAgo,
          submitted_at: threeDaysAgo,
          a1_score_on_100: 85.71,
          a1_weighted: 51.43,
          a2_score_on_100: 40.00,
          a2_weighted: 6.00,
          sec_score_on_100: 86.67,
          sec_weighted: 8.67,
          gen_score_on_100: 100.00,
          gen_weighted: 15.00,
          final_score: 79.39,
          final_classification: 'Good',
          score_locked_at: threeDaysAgo,
          ai_summary: 'Fabrice demonstrates strong security operations capability, particularly in monitoring and threat detection. Key strengths include implementing SIEM infrastructure from scratch and achieving full compliance with audit findings. Recommended focus areas: project management certification and deeper exposure to fraud monitoring frameworks.',
          ai_summary_generated_at: threeDaysAgo,
        }).select().single()

        if (evaluation) {
          // Get KPI templates
          const { data: a1T } = await supabase.from('kpi_templates').select('id,title').eq('department_code', 'IT').eq('category', 'A1').order('sort_order')
          const { data: a2T } = await supabase.from('kpi_templates').select('id').eq('department_code', 'IT').eq('category', 'A2_WIG')
          const { data: secT } = await supabase.from('kpi_templates').select('id').eq('department_code', 'IT').eq('category', 'secondary').order('sort_order')
          const { data: genT } = await supabase.from('kpi_templates').select('id').is('department_code', null).eq('category', 'generic').order('sort_order')

          const kpiRows: any[] = []
          const a1Ratings = [4, 4, 4, 4, 4, 5, 4]
          a1T?.forEach((t, i) => kpiRows.push({ evaluation_id: evaluation.id, kpi_template_id: t.id, category: 'A1', employee_rating: a1Ratings[i], sort_order: i + 1 }))
          a2T?.forEach(t => kpiRows.push({ evaluation_id: evaluation.id, kpi_template_id: t.id, category: 'A2_WIG', employee_rating: 2, sort_order: 1 }))
          const secRatings = [5, 4, 4]
          secT?.forEach((t, i) => kpiRows.push({ evaluation_id: evaluation.id, kpi_template_id: t.id, category: 'secondary', employee_rating: secRatings[i], sort_order: i + 1 }))
          const genRatings = [5, 5, 5, 5]
          genT?.forEach((t, i) => kpiRows.push({ evaluation_id: evaluation.id, kpi_template_id: t.id, category: 'generic', employee_rating: genRatings[i] || 5, sort_order: i + 1 }))

          await supabase.from('kpi_entries').insert(kpiRows)

          // Compute score hash
          const hashInput = a1Ratings.join('-') + '|' + '2' + '|' + secRatings.join('-') + '|' + genRatings.slice(0, genT?.length || 4).join('-') + '|79.39'
          const encoder = new TextEncoder()
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput))
          const scoreHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
          await supabase.from('evaluations').update({ score_hash: scoreHash }).eq('id', evaluation.id)

          // Seed KPI goals
          const goalStatements = [
            'Resolve all audit findings within 30 days of notification',
            'Implement advanced endpoint protection across all systems',
            'Complete quarterly penetration testing and vulnerability assessments',
            'Design and test DR failover procedures for critical infrastructure',
            'Maintain IT risk register and complete monthly risk reviews',
            'Achieve 99.9% uptime on all security monitoring platforms',
            'Draft and publish 3 new IT security policies',
          ]
          const goalRows = a1T?.map((t, i) => ({
            employee_id: employeeId,
            cycle_id: cycle.id,
            kpi_template_id: t.id,
            category: 'A1',
            goal_statement: goalStatements[i],
            target_rating: i === 5 ? 5 : 4,
            sort_order: i + 1,
          })) || []
          if (goalRows.length > 0) await supabase.from('kpi_goals').insert(goalRows)

          results.push({ evaluation: 'seeded', id: evaluation.id })
        }
      } else {
        results.push({ evaluation: 'already_exists' })
      }
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
