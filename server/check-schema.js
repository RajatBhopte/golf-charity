require('dotenv').config();
const supabase = require('./utils/supabase');

async function checkSchema() {
  try {
    // List tables using a direct query if possible, or try to select from expected tables
    const tables = ['users', 'profile', 'profiles'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' not found or error: ${error.message}`);
      } else {
        console.log(`Table '${table}' found! Sample data:`, data);
      }
    }
  } catch (err) {
    console.error('Error checking schema:', err);
  }
}

checkSchema();
