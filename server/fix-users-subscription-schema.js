const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

async function fixUsersSubscriptionSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const sql = `
    ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly';

    ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

    ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ;

    ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;

    ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ;
  `;

  console.log(
    "Applying users subscription schema fix (plan/start/renewal/cancelled/last payment columns)...",
  );

  try {
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      const message = String(error.message || "");
      if (
        message.includes('function "exec_sql" does not exist') ||
        message.includes("Could not find the function public.exec_sql")
      ) {
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
        console.error(
          "Failed to apply users subscription schema fix:",
          error.message,
        );
      }
      return;
    }

    console.log("Users subscription schema fix applied successfully.");
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

fixUsersSubscriptionSchema();
