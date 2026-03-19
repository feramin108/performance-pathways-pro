require('dotenv').config({ path: '/opt/spes/.env' });
const ldap = require('ldapjs');

const client = ldap.createClient({
  url: process.env.LDAP_URL,
  timeout: 15000,
  connectTimeout: 15000,
  tlsOptions: { rejectUnauthorized: false },
  reconnect: false,
});

client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
  if (err) { console.log('BIND FAILED:', err.message); return; }
  console.log('BIND: OK');

  const opts = {
    filter: '(sAMAccountName=fabrice.mbachan)',
    scope: 'sub',
    attributes: ['displayName','mail','memberOf','sAMAccountName'],
    referrals: false,
    derefAliases: 0,
  };

  client.search(process.env.LDAP_STAFF_OU, opts, (err, res) => {
    if (err) { console.log('SEARCH ERR:', err.message); return; }

    res.on('searchEntry', (entry) => {
      console.log('ENTRY FOUND:', entry.objectName);
      entry.attributes.forEach(a => {
        if (a.type !== 'memberOf')
          console.log(' ', a.type, ':', a.vals[0]);
      });
    });

    res.on('referral', (ref) => {
      console.log('REFERRAL (ignored):', ref[0].substring(0,50));
    });

    res.on('error', (e) => {
      console.log('RES ERROR code:', e.code, 'msg:', e.message);
    });

    res.on('end', (result) => {
      console.log('END status:', result.status);
      client.destroy();
    });
  });
});
