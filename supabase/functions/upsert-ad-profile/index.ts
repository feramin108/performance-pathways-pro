import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type UpsertAdProfilePayload = {
  username: string
  full_name: string
  email: string
  job_title?: string | null
  department?: string | null
  branch?: string | null
  employee_id?: string | null
  ad_groups?: string[]
  role?: string
}

const allowedOrigins = new Set([
  'http://172.20.50.3',
  'https://172.20.50.3',
])

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'http://172.20.50.3',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
})

const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(origin),
  })

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server configuration is missing' }, 500, origin)
  }

  let payload: UpsertAdProfilePayload

  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const {
    username,
    full_name,
    email,
    job_title = null,
    department = null,
    branch = null,
    employee_id = null,
    ad_groups = [],
    role = 'employee',
  } = payload

  if (!isNonEmptyString(username) || !isNonEmptyString(full_name) || !isNonEmptyString(email)) {
    return json({ error: 'username, full_name, and email are required' }, 400, origin)
  }

  if (!Array.isArray(ad_groups) || !ad_groups.every(isNonEmptyString)) {
    return json({ error: 'ad_groups must be an array of strings' }, 400, origin)
  }

  if (!isNonEmptyString(role)) {
    return json({ error: 'role must be a non-empty string' }, 400, origin)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date().toISOString()

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username.trim())
    .limit(1)
    .maybeSingle()

  if (existingProfileError) {
    return json({ error: existingProfileError.message }, 500, origin)
  }

  const profilePayload = {
    full_name: full_name.trim(),
    email: email.trim(),
    username: username.trim(),
    job_title: isNonEmptyString(job_title) ? job_title.trim() : null,
    department: isNonEmptyString(department) ? department.trim() : null,
    branch: isNonEmptyString(branch) ? branch.trim() : null,
    employee_id: isNonEmptyString(employee_id) ? employee_id.trim() : null,
    ad_groups,
    last_login_at: now,
    updated_at: now,
  }

  let profileId = existingProfile?.id ?? crypto.randomUUID()
  const isNewUser = !existingProfile

  if (existingProfile) {
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', profileId)

    if (updateProfileError) {
      return json({ error: updateProfileError.message }, 500, origin)
    }
  } else {
    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        created_at: now,
        is_active: true,
        ...profilePayload,
      })

    if (insertProfileError) {
      return json({ error: insertProfileError.message }, 500, origin)
    }
  }

  const { data: existingRole, error: existingRoleError } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', profileId)
    .limit(1)
    .maybeSingle()

  if (existingRoleError) {
    return json({ error: existingRoleError.message }, 500, origin)
  }

  if (existingRole) {
    const { error: updateRoleError } = await supabase
      .from('user_roles')
      .update({ role: role.trim() })
      .eq('id', existingRole.id)

    if (updateRoleError) {
      return json({ error: updateRoleError.message }, 500, origin)
    }
  } else {
    const { error: insertRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profileId,
        role: role.trim(),
        created_at: now,
      })

    if (insertRoleError) {
      return json({ error: insertRoleError.message }, 500, origin)
    }
  }

  return json(
    {
      profile_id: profileId,
      role: role.trim(),
      is_new_user: isNewUser,
    },
    200,
    origin,
  )
})
