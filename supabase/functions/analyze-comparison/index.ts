/// <reference path="../deno.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createGeminiClient, DEFAULT_GEMINI_MODEL } from "./geminiClient.ts";
import { createAnalyzeComparisonHandler } from "./handler.ts";
import { loadAuthorizedComparisonImages } from "./imageLoader.ts";
import { readUsageLimits } from "./usageLimits.ts";

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function errorResponse(error: unknown, status = 500): Response {
  const errorMessage =
    error instanceof Error ? error.message : "Internal server error";
  const errorStack = error instanceof Error ? error.stack : undefined;
  return new Response(
    JSON.stringify({
      error: errorMessage,
      stack: errorStack,
      code: "internal_error",
    }),
    {
      status,
      headers: JSON_HEADERS,
    },
  );
}

function requireConfiguredValue(value: string | undefined): string {
  if (!value) {
    throw new Error("A required runtime configuration value is missing.");
  }
  return value;
}

// Prevenir caídas abruptas del runtime ante promesas no controladas
if (typeof addEventListener === "function") {
  addEventListener("unhandledrejection", (event: any) => {
    console.error(
      "[analyze-comparison] Unhandled rejection capturada en worker:",
      event?.reason ?? event,
    );
    event?.preventDefault?.();
  });

  addEventListener("error", (event: any) => {
    console.error(
      "[analyze-comparison] Uncaught error capturado en worker:",
      event?.error ?? event,
    );
    event?.preventDefault?.();
  });
}

let cachedHandler: ((req: Request) => Promise<Response>) | null = null;

function getHandler(): (req: Request) => Promise<Response> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const supabaseServiceRoleKey = Deno.env
    .get("SUPABASE_SERVICE_ROLE_KEY")
    ?.trim();
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  const geminiModel =
    Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_GEMINI_MODEL;

  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push("SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("SUPABASE_ANON_KEY");
  if (!supabaseServiceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!geminiApiKey) missingVars.push("GEMINI_API_KEY");

  if (missingVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas en Supabase Edge Function: ${missingVars.join(", ")}`,
    );
  }

  const configuredSupabaseUrl = requireConfiguredValue(supabaseUrl);
  const configuredSupabaseAnonKey = requireConfiguredValue(supabaseAnonKey);
  const configuredSupabaseServiceRoleKey = requireConfiguredValue(
    supabaseServiceRoleKey,
  );
  const configuredGeminiApiKey = requireConfiguredValue(geminiApiKey);

  const gemini = createGeminiClient({
    apiKey: configuredGeminiApiKey,
    model: geminiModel,
  });
  const serviceClient = createClient(
    configuredSupabaseUrl,
    configuredSupabaseServiceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  cachedHandler = createAnalyzeComparisonHandler({
    async authenticate(authorization) {
      const client = createClient(
        configuredSupabaseUrl,
        configuredSupabaseAnonKey,
        {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const { data, error } = await client.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      return { id: data.user.id };
    },

    async findComparison(comparisonId, userId, authorization) {
      const client = createClient(
        configuredSupabaseUrl,
        configuredSupabaseAnonKey,
        {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
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
      const client = createClient(
        configuredSupabaseUrl,
        configuredSupabaseAnonKey,
        {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      return loadAuthorizedComparisonImages(comparison, async (path) => {
        const { data, error } = await client.storage
          .from("comparison-images")
          .download(path);
        if (error) throw error;
        return data;
      });
    },

    async analyzeImages(images) {
      return gemini.analyze(
        images.initial as Awaited<
          ReturnType<typeof loadAuthorizedComparisonImages>
        >["initial"],
        images.final as Awaited<
          ReturnType<typeof loadAuthorizedComparisonImages>
        >["final"],
      );
    },

    async persistReport({ comparison, analysis }) {
      const { data, error } = await serviceClient.rpc(
        "persist_ai_analysis_report",
        {
          p_comparison_id: comparison.id,
          p_user_id: comparison.user_id,
          p_model: analysis.model,
          p_contract_version: analysis.report.contractVersion,
          p_result: analysis.report,
          p_initial_image_path: comparison.initial_image_path,
          p_final_image_path: comparison.final_image_path,
        },
      );
      if (error) throw error;
      return data;
    },

    async reserveUsage(comparison) {
      const usageLimits = readUsageLimits((name) => Deno.env.get(name));
      const { data, error } = await serviceClient.rpc(
        "reserve_ai_analysis_usage",
        {
          p_comparison_id: comparison.id,
          p_user_id: comparison.user_id,
          p_initial_image_path: comparison.initial_image_path,
          p_final_image_path: comparison.final_image_path,
          p_global_per_minute: usageLimits.globalPerMinute,
          p_global_per_day: usageLimits.globalPerDay,
          p_user_per_day: usageLimits.userPerDay,
          p_comparison_per_day: usageLimits.comparisonPerDay,
        },
      );
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

  return cachedHandler;
}

try {
  Deno.serve(async (req: Request): Promise<Response> => {
    try {
      // 1. Manejo inmediato de preflight CORS (OPTIONS)
      if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
      }

      // 2. Inicialización diferida segura del handler con validación de entorno
      const handler = getHandler();

      // 3. Ejecución del handler principal
      return await handler(req);
    } catch (requestError) {
      console.error(
        "[analyze-comparison] Error crítico capturado en Deno.serve:",
        requestError,
      );
      return errorResponse(requestError, 500);
    }
  });
} catch (startupError) {
  console.error(
    "[analyze-comparison] Error fatal durante el arranque de Deno.serve:",
    startupError,
  );
}
