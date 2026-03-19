require('dotenv').config({ path: '/opt/spes/.env' });
const { ldapAuthenticate } = require('./auth/ldap-adapter.cjs');

// Replace with a real AD username (not password — type it manually)
ldapAuthenticate('fabrice.mbachan', 'Sk3ptic@nfc.2097')
  .then(profile => {
    console.log('SUCCESS');
    console.log('Username:', profile.username);
    console.log('Full name:', profile.full_name);
    console.log('Department:', profile.department);
    console.log('Branch:', profile.branch);
    console.log('Role from AD:', profile.adRole);
    console.log('ALL Groups:');
  profile.ad_groups.forEach(g => console.log('  -', g));
  })
  .catch(err => {
    console.log('FAILED:', err.message);
  });
