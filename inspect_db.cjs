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
  const { data: prods } = await sb.from('products').select('id, name, business_id');
  console.log('PRODUCTS COUNT:', prods?.length);
  console.log('PRODUCTS BY BUSINESS:');
  const grouped = {};
  (prods || []).forEach(p => {
    grouped[p.business_id] = grouped[p.business_id] || [];
    grouped[p.business_id].push(p.name);
  });
  console.log(JSON.stringify(grouped, null, 2));

  const { data: biz } = await sb.from('businesses').select('*');
  console.log('BUSINESSES:', JSON.stringify(biz, null, 2));

  const { data: roles } = await sb.from('user_roles').select('*');
  console.log('USER ROLES:', JSON.stringify(roles, null, 2));
}
run();
