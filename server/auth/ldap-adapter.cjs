const ldap = require('ldapjs');

const LDAP_URL      = process.env.LDAP_URL;
const BIND_DN       = process.env.LDAP_BIND_DN;
const BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD;
const BASE_DN       = process.env.LDAP_BASE_DN;
const STAFF_OU      = process.env.LDAP_STAFF_OU;
const HR_GROUP      = process.env.LDAP_HR_GROUP      || 'HR';
const MANAGER_GROUP = process.env.LDAP_MANAGER_GROUP || 'GM';

const DEPT_CODES = [
  'IT','RISK','CREDIT','FINCON','HR','GM','IA','CT',
  'EBS','SWIFT','STRA','CPU','LD','REC','LOG',
  'ICU','WU','ARC','BDS','COM','CONSULTANT'
];

const BRANCH_CODES = [
  '020','021','022','023','024','025','026','027',
  '030','031','032',
  '040','041','042','043',
  '050','051','052','053',
  '060','070'
];

const BLOCKED_GROUPS = ['test','BIOTIME_USERS','NFCAPP'];

function createClient() {
  return ldap.createClient({
    url: LDAP_URL,
    timeout: 15000,
    connectTimeout: 15000,
    tlsOptions: { rejectUnauthorized: false },
    reconnect: false,
  });
}

function bindAsync(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Use ldapsearch-style: run ldapsearch as child process
// This bypasses ldapjs referral handling issues with AD
const { execSync } = require('child_process');

function searchUserViaCLI(username) {
  try {
    const safeUser = username.replace(/[^a-zA-Z0-9._-]/g, '');
    // Re-read password directly to ensure it is available
    const bindPw = process.env.LDAP_BIND_PASSWORD || '';
    const bindDn = process.env.LDAP_BIND_DN || '';
    const ldapUrl = process.env.LDAP_URL || '';
    const staffOu = process.env.LDAP_STAFF_OU || '';
    if (!bindPw) { console.error('LDAP_BIND_PASSWORD is empty!'); return null; }
    const cmd = [
      'ldapsearch',
      `-H ${ldapUrl}`,
      `-D "${bindDn}"`,
      `-w "${bindPw}"`,
      `-b "${staffOu}"`,
      '-s sub',
      '-x',
      '-LLL',
      `"(sAMAccountName=${safeUser})"`,
      'displayName mail sAMAccountName title',
      'employeeID physicalDeliveryOfficeName',
      'memberOf distinguishedName',
    ].join(' ');

    const output = execSync(cmd, {
      timeout: 15000,
      encoding: 'utf8',
      stdio: ['pipe','pipe','pipe'],
    });

    if (!output || !output.includes('dn:')) return null;

    // Parse LDIF output
    const attrs = {};
    const memberOf = [];
    let currentAttr = '';
    let currentVal  = '';

    output.split('\n').forEach(line => {
      if (line.startsWith(' ')) {
        // Continuation line
        currentVal += line.trim();
        if (currentAttr === 'memberOf') {
          memberOf[memberOf.length - 1] += line.trim();
        } else {
          attrs[currentAttr] = currentVal;
        }
        return;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return;

      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();
      if (!val) return;

      currentAttr = key;
      currentVal  = val;

      if (key === 'memberof') {
        memberOf.push(val);
      } else {
        attrs[key] = val;
      }
    });

    attrs['memberof_arr'] = memberOf;
    return attrs;

  } catch (err) {
    console.error('ldapsearch CLI error:', err.message);
    return null;
  }
}

function parseGroups(memberOf) {
  if (!memberOf) return [];
  const arr = Array.isArray(memberOf) ? memberOf : [memberOf];
  return arr.map(dn => {
    const match = String(dn).match(/^CN=([^,]+)/i);
    return match ? match[1] : null;
  }).filter(Boolean);
}

function normaliseGroup(g) {
  // Strip G_ prefix: G_IT -> IT, G_031 -> 031, G_HR -> HR
  return g.replace(/^G_/i, '').toUpperCase();
}

function extractDeptFromGroups(groups, dn) {
  // Use DN OU path — first OU that matches a dept or branch code
  // CN=User,OU=IT,OU=UTILISATEURS,... → IT
  // CN=User,OU=031,OU=UTILISATEURS,... → 031
  if (dn) {
    const ouMatches = String(dn).match(/OU=([^,]+)/gi) || [];
    for (const ou of ouMatches) {
      const code = ou.replace(/^OU=/i, '').toUpperCase();
      if (DEPT_CODES.includes(code) || BRANCH_CODES.includes(code)) {
        return code;
      }
    }
  }
  return '';
}

function extractBranchFromGroups(groups) {
  for (const g of groups) {
    const norm = normaliseGroup(g);
    if (BRANCH_CODES.includes(norm)) return norm;
  }
  return '';
}

function extractBranchFromDN(dn) {
  const matches = String(dn).match(/OU=([^,]+)/gi) || [];
  for (const ou of matches) {
    const code = ou.replace(/^OU=/i, '');
    if (BRANCH_CODES.includes(code)) return code;
  }
  return '';
}

function detectRoleFromAD(groups) {
  const upper = groups.map(g => g.toUpperCase());
  if (upper.includes(HR_GROUP.toUpperCase()))      return 'hc';
  if (upper.includes(MANAGER_GROUP.toUpperCase())) return 'manager';
  return null;
}

function isBlocked(groups) {
  return groups.some(g =>
    BLOCKED_GROUPS.map(b => b.toLowerCase()).includes(g.toLowerCase())
  );
}

async function ldapAuthenticate(username, password) {
  // Step 1: Find user via ldapsearch CLI (bypasses ldapjs referral bug)
  const attrs = searchUserViaCLI(username);

  if (!attrs || !attrs['dn']) {
    throw new Error('User not found in Active Directory');
  }

  const userDN = attrs['dn'];
  console.log('Found user DN:', userDN);

  // Step 2: Parse groups
  const memberOf = attrs['memberof_arr'] || [];
  const groups   = parseGroups(memberOf);

  // Step 3: Block test accounts
  if (isBlocked(groups)) {
    throw new Error('This account is not authorised to access this system');
  }

  // Step 4: Verify password by binding as the user via ldapjs
  const userClient = createClient();
  try {
    await bindAsync(userClient, userDN, password);
    userClient.destroy();
    console.log('Password verified OK');
  } catch (err) {
    userClient.destroy();
    throw new Error('Invalid credentials');
  }

  // Step 5: Build profile
  const adRole = detectRoleFromAD(groups);
  const dept   = extractDeptFromGroups(groups, userDN);
  const branch = dept;  // branch = dept for branch staff (031, 040 etc.)

  return {
    username:    String(attrs['samaccountname'] || username),
    full_name:   String(attrs['displayname'] || username),
    email:       String(attrs['mail'] || ''),
    job_title:   String(attrs['title'] || ''),
    department:  dept,
    branch:      branch,
    employee_id: String(attrs['employeeid'] || ''),
    ad_groups:   groups,
    adRole,
  };
}

module.exports = { ldapAuthenticate };
