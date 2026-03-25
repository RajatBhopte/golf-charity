const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

async function fixDrawsSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const sql = `
    ALTER TABLE IF EXISTS public.draws 
    ADD COLUMN IF NOT EXISTS winning_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[];

    ALTER TABLE IF EXISTS public.draws 
    ADD COLUMN IF NOT EXISTS jackpot_rollover NUMERIC DEFAULT 0;
  `;

  console.log(
    "Attempting to fix draws schema (winning_numbers, jackpot_rollover)...",
  );

  try {
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        console.error(
          'Error: The "exec_sql" RPC function does not exist in your Supabase project.',
        );
        console.log("\n--- MANUAL FIX REQUIRED ---");
        console.log(
          "Please copy and execute the following SQL in your Supabase SQL Editor:\n",
        );
        console.log(sql);
        console.log("\n---------------------------");
      } else {
        console.error("Failed to add column:", error.message);
      }
      return;
    }

    console.log(
      "Successfully fixed draws schema columns (or they already existed).",
    );
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

fixDrawsSchema();
