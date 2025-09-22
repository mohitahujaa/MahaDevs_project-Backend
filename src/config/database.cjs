const { createClient } = require('@supabase/supabase-js');

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

if (!url || !key) {
  throw new Error('Supabase configuration missing: set SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE) in .env');
}

const supabase = createClient(url, key);

module.exports = supabase;


