require('dotenv').config({ path: '/opt/spes/.env' });

const express  = require('express');
const jwt      = require('jsonwebtoken');
const { ldapAuthenticate } = require('./auth/ldap-adapter.cjs');

const app  = express();
const PORT = process.env.LDAP_SERVER_PORT || 3001;

const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_FUNCTION_URL = `https://kidatdqlsqavghqejump.supabase.co/functions/v1/upsert-ad-profile`;

// Local PostgreSQL via psql CLI
const { execSync } = require('child_process');
const DB_PASS = process.env.DB_PASSWORD || 'Sk3ptic@Now2097';
const DB_USER = 'spes_user';
const DB_NAME = 'spes_db';
const DB_HOST = 'localhost';

function psqlQuery(sql) {
  const fs = require("fs");
  const tmpFile = "/tmp/spes_" + Date.now() + ".sql";
  fs.writeFileSync(tmpFile, sql);
  try {
    const result = execSync(
      `PGPASSWORD="${DB_PASS}" psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -A -f ${tmpFile}`,
      { encoding: "utf8", timeout: 10000 }
    ).trim();
    fs.unlinkSync(tmpFile);
    return result;
  } catch(err) {
    try { fs.unlinkSync(tmpFile); } catch(e) {}
    throw new Error("DB query error: " + (err.stderr || err.message));
  }
}

async function upsertProfileLocal(adProfile, finalRole) {
  const e = (s) => String(s||'').replace(/'/g, "''");
  const username = String(adProfile.username || '').replace(/'/g, '');  // strip quotes from username

  const existingRaw = psqlQuery(`SELECT id FROM profiles WHERE username = '${username}' LIMIT 1`);
  // Extract UUID from result
  const existingMatch = existingRaw ? existingRaw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) : null;
  const existing = existingMatch ? existingMatch[0] : null;

  let profileId;
  let isNewUser = false;

  if (existing) {
    profileId = existing;
    psqlQuery(`UPDATE profiles SET full_name='${e(adProfile.full_name)}', email='${e(adProfile.email)}', job_title='${e(adProfile.job_title)}', function_role='${e(adProfile.job_title)}', department='${e(adProfile.department)}', branch='${e(adProfile.branch)}', last_login_at=now(), updated_at=now() WHERE id='${profileId}'`);
    psqlQuery(`UPDATE user_roles SET role='${e(finalRole)}' WHERE user_id='${profileId}'`);
  } else {
    isNewUser = true;
    const empId = adProfile.employee_id ? `'${e(adProfile.employee_id)}'` : 'NULL';
    const insertResult = psqlQuery(`INSERT INTO profiles (username,full_name,email,job_title,function_role,department,branch,employee_id,is_active,employee_type,last_login_at) VALUES ('${username}','${e(adProfile.full_name)}','${e(adProfile.email)}','${e(adProfile.job_title)}','${e(adProfile.job_title)}','${e(adProfile.department)}','${e(adProfile.branch)}',${empId},true,'non_sales',now()) RETURNING id`);
    // Extract just the UUID from the result (may contain extra output)
    const uuidMatch = insertResult.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    profileId = uuidMatch ? uuidMatch[0] : insertResult.split('\n')[0].trim();
    psqlQuery(`INSERT INTO user_roles (user_id,role) VALUES ('${profileId}','${e(finalRole)}')`);
  }

  return { profile_id: profileId, role: finalRole, is_new_user: isNewUser };
}

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    auth: 'ldap',
    db: 'supabase',
    time: new Date().toISOString(),
  });
});

// LDAP Login
app.post('/api/auth/ldap', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required'
    });
  }

  // Strip DOMAIN\ prefix if present
  const cleanUsername = username.includes('\\')
    ? username.split('\\')[1]
    : username;

  try {
    // Step 1: Authenticate against AD
    const adProfile = await ldapAuthenticate(cleanUsername, password);

    // Step 2: Upsert profile in local PostgreSQL
    console.log("Upserting to local PostgreSQL...");
    const finalRoleForUpsert = adProfile.adRole || "employee";
    const { profile_id, role } = await upsertProfileLocal(adProfile, finalRoleForUpsert);
    console.log("Profile upserted:", profile_id, "role:", role);

    // Step 3: Determine final role
    // AD-determined roles (HR=hc, GM=manager) always win
    // Others use whatever the Edge Function returned from DB
    const finalRole = adProfile.adRole || role || 'employee';

    // Step 4: Issue JWT
    const token = jwt.sign(
      {
        sub:       profile_id,
        username:  adProfile.username,
        full_name: adProfile.full_name,
        email:     adProfile.email,
        role:      finalRole,
        dept:      adProfile.department,
        branch:    adProfile.branch,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    res.json({
      token,
      role: finalRole,
      profile: {
        id:         profile_id,
        full_name:  adProfile.full_name,
        email:      adProfile.email,
        department: adProfile.department,
        branch:     adProfile.branch,
        role:       finalRole,
      },
    });

  } catch (err) {
    console.error('Auth error:', err.message);

    if (err.message === 'Invalid credentials' ||
        err.message === 'User not found in Active Directory' ||
        err.message.includes('not authorised')) {
      return res.status(401).json({ error: err.message });
    }

    res.status(500).json({
      error: 'Authentication service unavailable. Contact IT support.'
    });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`SPES LDAP Auth Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
