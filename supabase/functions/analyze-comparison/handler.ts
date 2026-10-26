import { corsHeaders } from "../_shared/cors.ts";
export { corsHeaders };

export type AuthorizedUser = { id: string };

export type AuthorizedComparison = {
  id: string;
  user_id: string;
  initial_image_path: string | null;
  final_image_path: string | null;
};

export type AnalyzeDependencies = {
  authenticate: (authorization: string) => Promise<AuthorizedUser | null>;
  findComparison: (
    comparisonId: string,
    userId: string,
    authorization: string,
  ) => Promise<AuthorizedComparison | null>;
  loadImages: (
    comparison: AuthorizedComparison,
    authorization: string,
  ) => Promise<{ initial: unknown; final: unknown }>;
  analyzeImages: (images: { initial: unknown; final: unknown }) => Promise<{
    model: string;
    report: { contractVersion: string } & Record<string, unknown>;
  }>;
  persistReport: (input: {
    comparison: AuthorizedComparison;
    analysis: { model: string; report: { contractVersion: string } & Record<string, unknown> };
  }) => Promise<unknown>;
  reserveUsage: (comparison: AuthorizedComparison) => Promise<
    | { action: "reserved"; attemptId: string }
    | { action: "cached"; report: unknown }
    | { action: "limited"; scope: string }
    | { action: "in_progress"; attemptId: string }
  >;
  completeUsage: (
    attemptId: string,
    status: "succeeded" | "failed_uncertain",
  ) => Promise<void>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function jsonResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ code, message, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });
}

function errorResponse(
  error: unknown,
  status = 500,
  extra: Record<string, unknown> = {},
): Response {
  const errorMessage =
    error instanceof Error ? error.message : "Internal server error";
  const errorStack = error instanceof Error ? error.stack : undefined;
  return new Response(
    JSON.stringify({
      error: errorMessage,
      ...(errorStack ? { stack: errorStack } : {}),
      ...extra,
    }),
    {
      status,
      headers: JSON_HEADERS,
    },
  );
}

export function createAnalyzeComparisonHandler(dependencies: AnalyzeDependencies) {
  return async function handleAnalyzeComparison(request: Request): Promise<Response> {
    try {
      // 1. Preflight CORS
      if (request.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
      }

      if (request.method !== "POST") {
        return jsonResponse(405, "method_not_allowed", "Solo se admite POST.");
      }

      console.log("[analyze-comparison] Solicitud POST recibida. Procesando JWT...");

      // 2. Auth Header
      const authorization = request.headers.get("Authorization")?.trim();
      if (!authorization?.startsWith("Bearer ")) {
        return jsonResponse(401, "unauthorized", "Se requiere una sesión válida.");
      }

      let user: AuthorizedUser | null;
      try {
        user = await dependencies.authenticate(authorization);
      } catch (authError) {
        console.error("[analyze-comparison] Error al autenticar usuario:", authError);
        return jsonResponse(401, "unauthorized", "La sesión no es válida.");
      }

      if (!user) {
        return jsonResponse(401, "unauthorized", "La sesión no es válida.");
      }

      // 3. Parse JSON Body
      let body: unknown;
      try {
        body = await request.json();
      } catch (jsonError) {
        console.error("[analyze-comparison] Error al parsear JSON del request:", jsonError);
        return jsonResponse(400, "invalid_request", "El cuerpo debe ser JSON válido.");
      }

      const comparisonId =
        typeof body === "object" && body !== null && "comparisonId" in body
          ? (body as { comparisonId?: unknown }).comparisonId
          : undefined;

      if (typeof comparisonId !== "string" || !UUID_PATTERN.test(comparisonId)) {
        return jsonResponse(400, "invalid_comparison_id", "comparisonId no es válido.");
      }

      // 4. Comparison Database Lookup
      let comparison: AuthorizedComparison | null;
      try {
        comparison = await dependencies.findComparison(
          comparisonId,
          user.id,
          authorization,
        );
      } catch (dbError) {
        console.error("[analyze-comparison] Error en base de datos al buscar comparación:", dbError);
        return errorResponse(dbError, 500, {
          code: "comparison_lookup_failed",
          message: "No fue posible comprobar la comparación.",
        });
      }

      if (!comparison || comparison.user_id !== user.id) {
        return jsonResponse(
          404,
          "comparison_not_found",
          "La comparación no existe o no está disponible.",
        );
      }

      if (!comparison.initial_image_path || !comparison.final_image_path) {
        return jsonResponse(
          409,
          "comparison_incomplete",
          "La comparación necesita las dos fotografías.",
        );
      }

      // 5. Download Images from Storage
      let images: { initial: unknown; final: unknown };
      try {
        console.log("[analyze-comparison] Descargando imágenes de Supabase Storage...");
        images = await dependencies.loadImages(comparison, authorization);
        console.log("[analyze-comparison] Imágenes descargadas correctamente en memoria.");
      } catch (storageError) {
        console.error("[analyze-comparison] Error al descargar imágenes de Supabase Storage:", storageError);
        const code =
          typeof storageError === "object" && storageError !== null && "code" in storageError
            ? String(storageError.code)
            : "image_load_failed";
        const isClientValidation =
          code === "image_not_found" || code === "image_too_large" || code === "invalid_image_type";
        if (isClientValidation) {
          const status = code === "image_not_found" ? 404 : code === "image_too_large" ? 413 : 422;
          return jsonResponse(status, code, "No fue posible preparar las fotografías para el análisis.");
        }
        return errorResponse(storageError, 500, {
          code: "image_load_failed",
          message: "Error de red al descargar imágenes de almacenamiento.",
        });
      }

      // 6. Quota / Usage Limits Check
      let reservation: Awaited<ReturnType<AnalyzeDependencies["reserveUsage"]>>;
      try {
        console.log("[analyze-comparison] Validando cuotas de uso en base de datos...");
        reservation = await dependencies.reserveUsage(comparison);
        console.log("[analyze-comparison] Estado de cuota obtenido:", reservation.action);
      } catch (quotaError) {
        console.error("[analyze-comparison] Error al validar cuota de uso en base de datos:", quotaError);
        return errorResponse(quotaError, 500, {
          code: "usage_limits_unavailable",
          message: "No fue posible validar la cuota de uso en la base de datos.",
        });
      }

      if (reservation.action === "cached") {
        return new Response(JSON.stringify(reservation.report), { status: 200, headers: JSON_HEADERS });
      }
      if (reservation.action === "limited") {
        return jsonResponse(429, "usage_limit_reached", "Se alcanzó el límite de análisis.", {
          scope: reservation.scope,
        });
      }
      if (reservation.action === "in_progress") {
        return jsonResponse(409, "analysis_in_progress", "Este análisis ya está en curso.");
      }

      const attemptId = reservation.attemptId;

      // 7. Visual Inference with Gemini SDK / API
      let analysis: Awaited<ReturnType<AnalyzeDependencies["analyzeImages"]>>;
      try {
        console.log("[analyze-comparison] Iniciando inferencia visual con Gemini API...");
        analysis = await dependencies.analyzeImages(images);
        console.log("[analyze-comparison] Respuesta de Gemini recibida con éxito.");
      } catch (geminiError) {
        console.error("[analyze-comparison] Error durante la llamada a Gemini AI:", geminiError);
        await dependencies.completeUsage(attemptId, "failed_uncertain").catch(() => undefined);
        const code =
          typeof geminiError === "object" && geminiError !== null && "code" in geminiError
            ? String(geminiError.code)
            : "gemini_network_error";

        if (code === "provider_quota_exceeded") {
          return jsonResponse(429, code, "Gemini no tiene cuota disponible.");
        }
        if (code === "gemini_timeout") {
          return jsonResponse(504, code, "Gemini excedió el tiempo de espera.");
        }

        return errorResponse(geminiError, 500, {
          code,
          message: "No fue posible completar el análisis visual con Gemini.",
        });
      }

      // 8. Persist Report in ai_analysis_reports
      try {
        console.log("[analyze-comparison] Guardando reporte en ai_analysis_reports...");
        const persisted = await dependencies.persistReport({ comparison, analysis });
        console.log("[analyze-comparison] Reporte guardado con éxito.");
        await dependencies.completeUsage(attemptId, "succeeded").catch(() => undefined);
        return new Response(JSON.stringify(persisted), { status: 200, headers: JSON_HEADERS });
      } catch (persistError) {
        console.error("[analyze-comparison] Error al guardar reporte en base de datos:", persistError);
        await dependencies.completeUsage(attemptId, "failed_uncertain").catch(() => undefined);
        const message = persistError instanceof Error ? persistError.message : "";
        const stale = message.includes("comparison_images_changed");
        if (stale) {
          return jsonResponse(409, "analysis_stale", "Las fotografías cambiaron durante el análisis.");
        }
        return errorResponse(persistError, 500, {
          code: "analysis_persistence_failed",
          message: "El informe no pudo guardarse en la base de datos.",
        });
      }
    } catch (unhandledError) {
      console.error("[analyze-comparison] Unhandled error:", unhandledError);
      return errorResponse(unhandledError, 500, {
        code: "internal_error",
      });
    }
  };
}
