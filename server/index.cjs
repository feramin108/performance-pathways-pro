require('dotenv').config({ path: '/opt/spes/.env' });

const express  = require('express');
const jwt      = require('jsonwebtoken');
const { ldapAuthenticate } = require('./auth/ldap-adapter.cjs');

const app  = express();
const PORT = process.env.LDAP_SERVER_PORT || 3001;

const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_FUNCTION_URL = `https://kidatdqlsqavghqejump.supabase.co/functions/v1/upsert-ad-profile`;

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

    // Step 2: Upsert profile via Edge Function
    console.log('Calling Edge Function:', EDGE_FUNCTION_URL);
    console.log('Anon key present:', !!SUPABASE_ANON_KEY);

    // Add timeout to fetch
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

    const { profile_id, role } = await efResponse.json();

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
