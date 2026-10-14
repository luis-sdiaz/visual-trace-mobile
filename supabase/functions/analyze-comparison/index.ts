// Supabase Edge Runtime provides Deno and supports npm specifiers.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import { createAnalyzeComparisonHandler } from "./handler.ts";
import { loadAuthorizedComparisonImages } from "./imageLoader.ts";
import { createGeminiClient } from "./geminiClient.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const geminiModel = Deno.env.get("GEMINI_MODEL") ?? undefined;

if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
  throw new Error("Supabase Edge Function environment is not configured.");
}

const gemini = createGeminiClient({ apiKey: geminiApiKey, model: geminiModel });

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
});

Deno.serve(handler);
