const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Supabase config missing — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.",
  );
}

// Single shared client for all server-side queries.
// auth.persistSession: false because this runs server-side — no browser session needed.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
