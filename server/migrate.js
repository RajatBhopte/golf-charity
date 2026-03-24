require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const schemaFiles = [
    path.join(__dirname, '..', 'supabase_schema.sql'),
    path.join(__dirname, '..', 'advanced_features_schema.sql'),
  ];

  console.log('Starting migration...');

  try {
    for (const sqlPath of schemaFiles) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Applying ${path.basename(sqlPath)}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
          console.error('Error: The "exec_sql" RPC function does not exist in your Supabase project.');
          console.log(`Please manually execute the contents of "${path.basename(sqlPath)}" in the Supabase SQL Editor.`);
          return;
        }

        console.error(`Migration failed while applying ${path.basename(sqlPath)}:`, error.message);
        return;
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Unexpected error during migration:', err);
  }
}

migrate();
