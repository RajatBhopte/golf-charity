const { createClient } = require('@supabase/supabase-js');

// Initialize with the Service Role key to bypass RLS for admin operations
// like syncing the user to the public.users table during signup.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
