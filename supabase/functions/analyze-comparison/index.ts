// Supabase Edge Runtime provides Deno and supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import { createAnalyzeComparisonHandler } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase Edge Function environment is not configured.");
}

const handler = createAnalyzeComparisonHandler({
  async authenticate(authorization) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return { id: data.user.id };
  },

  async findComparison(comparisonId, userId, authorization) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("comparisons")
      .select("id,user_id,initial_image_path,final_image_path")
      .eq("id", comparisonId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },
});

Deno.serve(handler);
