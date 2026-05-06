import re

content = open('/opt/spes/server/index.cjs').read()

# Add local DB function after the EDGE_FUNCTION_URL line
old1 = "const EDGE_FUNCTION_URL = `https://kidatdqlsqavghqejump.supabase.co/functions/v1/upsert-ad-profile`;"

new1 = """const EDGE_FUNCTION_URL = `https://kidatdqlsqavghqejump.supabase.co/functions/v1/upsert-ad-profile`;

// Local PostgreSQL via psql CLI
const { execSync } = require('child_process');
const DB_PASS = process.env.DB_PASSWORD || 'Sk3ptic@Now2097';
const DB_USER = 'spes_user';
const DB_NAME = 'spes_db';
const DB_HOST = 'localhost';

function psqlQuery(sql) {
  const cmd = `PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -A -c "${sql.replace(/"/g, '\\\\"').replace(/'/g, "'\\''")}"`;
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim();
  } catch(err) {
    throw new Error('DB query error: ' + err.stderr);
  }
}

async function upsertProfileLocal(adProfile, finalRole) {
  const e = (s) => String(s||'').replace(/'/g, "''");
  const username = e(adProfile.username);

  const existing = psqlQuery(`SELECT id FROM profiles WHERE username = '${username}' LIMIT 1`);

  let profileId;
  let isNewUser = false;

  if (existing && existing.length > 10) {
    profileId = existing.split('\\n')[0].trim();
    psqlQuery(`UPDATE profiles SET full_name='${e(adProfile.full_name)}', email='${e(adProfile.email)}', job_title='${e(adProfile.job_title)}', function_role='${e(adProfile.job_title)}', department='${e(adProfile.department)}', branch='${e(adProfile.branch)}', last_login_at=now(), updated_at=now() WHERE id='${profileId}'`);
    psqlQuery(`UPDATE user_roles SET role='${e(finalRole)}' WHERE user_id='${profileId}'`);
  } else {
    isNewUser = true;
    const empId = adProfile.employee_id ? `'${e(adProfile.employee_id)}'` : 'NULL';
    profileId = psqlQuery(`INSERT INTO profiles (username,full_name,email,job_title,function_role,department,branch,employee_id,is_active,employee_type,last_login_at) VALUES ('${username}','${e(adProfile.full_name)}','${e(adProfile.email)}','${e(adProfile.job_title)}','${e(adProfile.job_title)}','${e(adProfile.department)}','${e(adProfile.branch)}',${empId},true,'non_sales',now()) RETURNING id`);
    profileId = profileId.trim();
    psqlQuery(`INSERT INTO user_roles (user_id,role) VALUES ('${profileId}','${e(finalRole)}')`);
  }

  return { profile_id: profileId, role: finalRole, is_new_user: isNewUser };
}"""

if old1 in content:
    content = content.replace(old1, new1)
    print('Step 1: PATCHED')
else:
    print('Step 1: NOT FOUND')

# Replace Edge Function call with local DB call
old2 = """    // Step 2: Upsert profile via Edge Function
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.error('Edge Function call timed out after 10s');
    }, 10000);

    const efResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        username:    adProfile.username,
        full_name:   adProfile.full_name,
        email:       adProfile.email,
        job_title:   adProfile.job_title,
        department:  adProfile.department,
        branch:      adProfile.branch,
        employee_id: adProfile.employee_id,
        ad_groups:   adProfile.ad_groups,
        role:        adProfile.adRole || 'employee',
      }),
    });

    clearTimeout(timeout);
    console.log('Edge Function response status:', efResponse.status);
    if (!efResponse.ok) {
      const efError = await efResponse.text();
      console.error('Edge Function error:', efResponse.status, efError);
      throw new Error(`Profile sync failed: ${efError}`);
    }

    const { profile_id, role } = await efResponse.json();"""

new2 = """    // Step 2: Upsert profile in local PostgreSQL
    console.log('Upserting to local PostgreSQL...');
    const finalRoleForUpsert = adProfile.adRole || 'employee';
    const { profile_id, role } = await upsertProfileLocal(adProfile, finalRoleForUpsert);
    console.log('Profile upserted:', profile_id, 'role:', role);"""

if old2 in content:
    content = content.replace(old2, new2)
    print('Step 2: PATCHED')
else:
    print('Step 2: NOT FOUND')

open('/opt/spes/server/index.cjs', 'w').write(content)
print('Done')
