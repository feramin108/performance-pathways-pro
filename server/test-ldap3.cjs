require('dotenv').config({ path: '/opt/spes/.env' });
const ldap = require('ldapjs');

const bases = [
  'OU=IT,OU=UTILISATEURS,OU=NFCBANK,DC=nfcbank,DC=lan',
  'OU=UTILISATEURS,OU=NFCBANK,DC=nfcbank,DC=lan',
  'OU=NFCBANK,DC=nfcbank,DC=lan',
  'DC=nfcbank,DC=lan',
];

async function trySearch(base) {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: process.env.LDAP_URL,
      timeout: 10000,
      connectTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false },
    });

    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
      if (err) { resolve(`${base} → BIND FAILED: ${err.message}`); client.destroy(); return; }

      const opts = {
        filter: '(sAMAccountName=fabrice.mbachan)',
        scope: 'sub',
        attributes: ['displayName'],
      };

      let found = false;
      client.search(base, opts, (err, res) => {
        if (err) { resolve(`${base} → SEARCH ERR: ${err.message}`); client.destroy(); return; }

        res.on('searchEntry', () => { found = true; });
        res.on('referral', () => {});
        res.on('error', (e) => {
          resolve(`${base} → ERROR: ${e.message} (found=${found})`);
          client.destroy();
        });
        res.on('end', () => {
          resolve(`${base} → OK found=${found}`);
          client.destroy();
        });
      });
    });
  });
}

(async () => {
  for (const base of bases) {
    const result = await trySearch(base);
    console.log(result);
  }
})();
