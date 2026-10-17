const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > -1) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error: uErr } = await sb.auth.admin.listUsers();
  console.log('AUTH USERS:');
  (users?.users || []).forEach(u => {
    console.log(`- ${u.id}: ${u.email} (last_sign_in: ${u.last_sign_in_at})`);
  });
}
run();
