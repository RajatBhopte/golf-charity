require('dotenv').config();
const supabase = require('./utils/supabase');

const email = process.argv[2];

if (!email) {
  console.error('Please provide a user email: node activate-user.js user@example.com');
  process.exit(1);
}

async function activateUser() {
  try {
    // Find user in auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError.message);
      return;
    }

    const authUser = users.find(u => u.email === email);
    if (!authUser) {
      console.error(`User with email ${email} not found in Supabase Auth.`);
      return;
    }

    // UPSERT into public.users to ensure the row exists (since the table was created AFTER they signed up)
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({ 
        id: authUser.id, 
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'Test User',
        role: 'user',
        subscription_status: 'active',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting status:', upsertError.message);
    } else {
      console.log(`Successfully activated user: ${email} (ID: ${authUser.id})`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

activateUser();
