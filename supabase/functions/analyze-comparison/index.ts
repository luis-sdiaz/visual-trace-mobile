// Supabase Edge Runtime provides Deno and supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import { createAnalyzeComparisonHandler } from "./handler.ts";
import { loadAuthorizedComparisonImages } from "./imageLoader.ts";
import { createGeminiClient } from "./geminiClient.ts";
import { readUsageLimits } from "./usageLimits.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const geminiModel = Deno.env.get("GEMINI_MODEL") ?? undefined;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !geminiApiKey) {
  throw new Error("Supabase Edge Function environment is not configured.");
}

const gemini = createGeminiClient({ apiKey: geminiApiKey, model: geminiModel });
const usageLimits = readUsageLimits((name) => Deno.env.get(name));
const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

  async loadImages(comparison, authorization) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return loadAuthorizedComparisonImages(comparison, async (path) => {
      const { data, error } = await client.storage.from("comparison-images").download(path);
      if (error) throw error;
      return data;
    });
  },

  async analyzeImages(images) {
    return gemini.analyze(
      images.initial as Awaited<ReturnType<typeof loadAuthorizedComparisonImages>>["initial"],
      images.final as Awaited<ReturnType<typeof loadAuthorizedComparisonImages>>["final"],
    );
  },

  async persistReport({ comparison, analysis }) {
    const { data, error } = await serviceClient.rpc("persist_ai_analysis_report", {
      p_comparison_id: comparison.id,
      p_user_id: comparison.user_id,
      p_model: analysis.model,
      p_contract_version: analysis.report.contractVersion,
      p_result: analysis.report,
      p_initial_image_path: comparison.initial_image_path,
      p_final_image_path: comparison.final_image_path,
    });
    if (error) throw error;
    return data;
  },

  async reserveUsage(comparison) {
    const { data, error } = await serviceClient.rpc("reserve_ai_analysis_usage", {
      p_comparison_id: comparison.id,
      p_user_id: comparison.user_id,
      p_initial_image_path: comparison.initial_image_path,
      p_final_image_path: comparison.final_image_path,
      p_global_per_minute: usageLimits.globalPerMinute,
      p_global_per_day: usageLimits.globalPerDay,
      p_user_per_day: usageLimits.userPerDay,
      p_comparison_per_day: usageLimits.comparisonPerDay,
    });
    if (error || !data) throw error ?? new Error("Usage reservation failed.");
    return data;
  },

  async completeUsage(attemptId, status) {
    const { error } = await serviceClient.rpc("complete_ai_analysis_usage", {
      p_attempt_id: attemptId,
      p_status: status,
    });
    if (error) throw error;
  },
});

Deno.serve(handler);
